/**
 * Assignment Taker Page
 *
 * Main homework submission interface where students answer questions.
 *
 * KNOWN ISSUES (reported by students):
 * - Sometimes takes 5-10 seconds to load
 * - Images occasionally fail to load
 * - Answers sometimes fail to save without error message
 * - Progress not always saved when navigating between questions
 *
 * YOUR TASK:
 * Analyze this code to identify root causes and propose solutions.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, BookOpenIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import {
  getHomeworkAssignment,
  getOrCreateHomeworkSession,
  saveHomeworkResponse,
  updateHomeworkSessionProgress,
  submitHomeworkAssignment,
  getStudentHomeworkResponsesMap,
  canStudentAccessAssignment,
  AssignmentWithQuestions,
  HomeworkSession,
  HomeworkQuestion,
  getOptionText,
  getOptionImageUrl,
  isGridQuestionOptions,
  GridQuestionOptions
} from '../../../lib/homeworkUtils';
import { trackFeatureClickAuto } from '../../../lib/analytics';
import ReliableImage from '../../../components/ReliableImage';

export default function AssignmentTaker() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [assignment, setAssignment] = useState<AssignmentWithQuestions | null>(null);
  const [session, setSession] = useState<HomeworkSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assignment and session data
  // NOTE: Multiple sequential database calls - potential performance bottleneck
  useEffect(() => {
    const loadAssignmentData = async () => {
      if (!id) return;

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        // Check if student can access this assignment
        const canAccess = await canStudentAccessAssignment(user.id, id);
        if (!canAccess) {
          setError('You do not have access to this assignment.');
          setLoading(false);
          return;
        }

        // Load assignment with questions
        const assignmentData = await getHomeworkAssignment(id);
        if (!assignmentData) {
          setError('Assignment not found.');
          setLoading(false);
          return;
        }

        setAssignment(assignmentData);

        // Get or create homework session
        const sessionData = await getOrCreateHomeworkSession(user.id, id);
        if (sessionData) {
          setSession(sessionData);
          setCurrentQuestion(sessionData.current_question_index);

          // If session is already completed, show results
          if (sessionData.is_completed) {
            setIsSubmitted(true);
          }
        }

        // Load existing responses with error handling
        try {
          const responses = await getStudentHomeworkResponsesMap(user.id, id);
          setAnswers(responses);
        } catch (responseError) {
          console.error('Error loading existing responses:', responseError);
          // Continue with empty responses rather than failing
          setAnswers({});
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading assignment:', error);
        setError('Failed to load assignment. Please try again.');
        setLoading(false);
      }
    };

    loadAssignmentData();
  }, [id, router]);

  // Track analytics when component loads
  useEffect(() => {
    if (assignment && !loading) {
      trackFeatureClickAuto('homework_assignment_started');
    }
  }, [assignment, loading]);

  const question = assignment?.questions[currentQuestion];
  const totalQuestions = assignment?.questions.length || 0;

  // Handle answer selection
  // NOTE: Silent failures with console.warn - students don't see errors
  const handleAnswer = async (option: any) => {
    if (!question || !assignment || !session) return;

    const answer = getOptionText(option);

    setAnswers({
      ...answers,
      [question.id]: answer
    });

    // Save response to database with error handling
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const success = await saveHomeworkResponse(user.id, question.id, assignment.id, answer, question, session.id);
        if (!success) {
          console.warn('Failed to save response, continuing with local state');
          // ISSUE: Student doesn't see this warning
        }
      }
    } catch (error) {
      console.error('Error saving response:', error);
      // ISSUE: Silent failure - UI continues as if everything is fine
    }
  };

  const handleTickboxAnswer = async (option: any) => {
    if (!question || !assignment || !session) return;

    const optionText = getOptionText(option);
    const currentAnswers = (answers[question.id] as string[]) || [];

    let newAnswers;
    if (currentAnswers.includes(optionText)) {
      newAnswers = currentAnswers.filter(answer => answer !== optionText);
    } else {
      newAnswers = [...currentAnswers, optionText];
    }

    setAnswers({
      ...answers,
      [question.id]: newAnswers
    });

    // Save response to database with error handling
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const success = await saveHomeworkResponse(user.id, question.id, assignment.id, JSON.stringify(newAnswers), question, session.id);
        if (!success) {
          console.warn('Failed to save tickbox response, continuing with local state');
        }
      }
    } catch (error) {
      console.error('Error saving tickbox response:', error);
    }
  };

  // Navigation handlers
  // NOTE: Updates session on every navigation - network overhead
  const handlePrevious = async () => {
    if (currentQuestion > 0 && session) {
      const newIndex = currentQuestion - 1;
      setCurrentQuestion(newIndex);
      try {
        await updateHomeworkSessionProgress(session.id, newIndex);
      } catch (error) {
        console.error('Error updating session progress:', error);
        // Continue navigation even if progress update fails
      }
    }
  };

  const handleNext = async () => {
    if (currentQuestion < totalQuestions - 1 && session) {
      const newIndex = currentQuestion + 1;
      setCurrentQuestion(newIndex);
      try {
        await updateHomeworkSessionProgress(session.id, newIndex);
      } catch (error) {
        console.error('Error updating session progress:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!assignment || !session) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Submit assignment
      const success = await submitHomeworkAssignment(user.id, assignment.id);

      if (success) {
        await updateHomeworkSessionProgress(session.id, currentQuestion, true);
        await trackFeatureClickAuto('homework_assignment_completed');

        setIsSubmitted(true);

        // Navigate back to dashboard after delay
        setTimeout(() => {
          router.push('/student');
        }, 3000);
      } else {
        setError('Failed to submit assignment. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setError('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    const questionData = assignment?.questions.find(q => q.id === questionId);

    if (Array.isArray(answer)) {
      return answer.length > 0;
    }

    if (questionData?.question_type === 'grid' && typeof answer === 'object' && answer !== null) {
      const gridOptions = questionData.options as GridQuestionOptions;
      if (isGridQuestionOptions(gridOptions)) {
        const gridAnswers = answer as Record<string, number>;
        return gridOptions.rows.every((_, index) => gridAnswers[index.toString()] !== undefined);
      }
    }

    return answer !== undefined && answer !== '';
  };

  const areAllQuestionsAnswered = () => {
    return assignment?.questions.every(q => isQuestionAnswered(q.id)) || false;
  };

  const renderQuestionImages = (question: HomeworkQuestion) => {
    const allImages = [...(question.image_urls || [])];
    if (question.image_url && !allImages.includes(question.image_url)) {
      allImages.unshift(question.image_url);
    }

    if (allImages.length === 0) return null;

    return (
      <div className="mb-4">
        {allImages.length === 1 ? (
          <ReliableImage
            key={`img-${question.id}-${allImages[0]}`}
            src={allImages[0]}
            alt="Question visual"
            className="rounded-xl max-h-96 w-auto mx-auto"
            fallbackText="Question image not available"
            priority={true}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allImages.map((imageUrl, index) => (
              <ReliableImage
                key={`img-${question.id}-${imageUrl}-${index}`}
                src={imageUrl}
                alt={`Question visual ${index + 1}`}
                className="rounded-xl max-h-48 w-full object-cover"
                fallbackText={`Question image ${index + 1} not available`}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQuestion = () => {
    if (!question) return null;

    switch (question.question_type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            {renderQuestionImages(question)}
            <h3 className="text-xl font-medium text-gray-800" style={{ whiteSpace: 'pre-line' }}>
              {question.question_text}
            </h3>
            <div className="space-y-3 mt-4">
              {Array.isArray(question.options) && question.options.map((option, index) => {
                const optionText = getOptionText(option);
                const optionImageUrl = getOptionImageUrl(option);
                const isSelected = answers[question.id] === optionText;
                const optionKey = `${optionText}-${index}`;

                return (
                  <div
                    key={optionKey}
                    onClick={() => handleAnswer(option)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                        isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isSelected ? (
                          <CheckIcon size={14} />
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        {optionImageUrl && (
                          <ReliableImage
                            key={`option-img-${question.id}-${index}-${optionImageUrl}`}
                            src={optionImageUrl}
                            alt={`Option ${String.fromCharCode(65 + index)}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            fallbackText="Option image"
                          />
                        )}
                        <span>{optionText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'tickbox':
        return (
          <div className="space-y-4">
            {renderQuestionImages(question)}
            <h3 className="text-xl font-medium text-gray-800" style={{ whiteSpace: 'pre-line' }}>
              {question.question_text}
            </h3>
            <div className="text-sm text-gray-600 mb-3">
              Select all correct answers:
            </div>
            <div className="space-y-3 mt-4">
              {Array.isArray(question.options) && question.options.map((option, index) => {
                const optionText = getOptionText(option);
                const selectedAnswers = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
                const isSelected = selectedAnswers.includes(optionText);
                const optionKey = `${optionText}-${index}`;

                return (
                  <div
                    key={optionKey}
                    onClick={() => handleTickboxAnswer(option)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-5 h-5 border-2 rounded flex-shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-800 text-base">{optionText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'short-answer':
        return (
          <div>
            {renderQuestionImages(question)}
            <h3 className="text-xl font-medium text-gray-800 mb-4" style={{ whiteSpace: 'pre-line' }}>
              {question.question_text}
            </h3>
            <input
              type="text"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="Type your answer here..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
        <div className="text-2xl font-semibold text-gray-600">Loading assignment...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-600 mb-4">{error}</div>
          <button
            onClick={() => router.push('/student')}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
        <div className="text-2xl font-semibold text-gray-600">Assignment not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
                Ottodot LMS
              </div>
            </div>
            <div>
              <button
                onClick={() => router.push('/student')}
                className="text-gray-500 hover:text-gray-700"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSubmitted ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Assignment Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Great job completing your assignment!
            </p>
            <button
              onClick={() => router.push('/student')}
              className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {assignment.title}
              </h2>
              <div
                className="text-gray-600 mb-4"
                dangerouslySetInnerHTML={{
                  __html: assignment.description?.replace(/\n/g, '<br />') || ''
                }}
              />
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}</div>
                <div>
                  Question {currentQuestion + 1} of {totalQuestions}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div
                  className="bg-teal-400 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestion + 1) / totalQuestions) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div key={`question-${currentQuestion}-${question?.id}`}>
                {renderQuestion()}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  currentQuestion === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon size={16} className="mr-2" />
                Previous
              </button>

              {currentQuestion < totalQuestions - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!question || !isQuestionAnswered(question.id)}
                  className={`flex items-center px-6 py-2 rounded-lg ${
                    !question || !isQuestionAnswered(question.id)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-teal-500 text-white hover:bg-teal-600'
                  }`}
                >
                  Next
                  <ArrowRightIcon size={16} className="ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!areAllQuestionsAnswered() || isSubmitting}
                  className={`flex items-center px-6 py-2 rounded-lg ${
                    !areAllQuestionsAnswered() || isSubmitting
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                  {!isSubmitting && <CheckIcon size={16} className="ml-2" />}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
