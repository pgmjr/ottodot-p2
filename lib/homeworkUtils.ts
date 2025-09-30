/**
 * Homework Utilities
 *
 * Core business logic for homework assignment submission flow.
 *
 * NOTE FOR REVIEWERS:
 * This file contains several performance and reliability issues that have been
 * reported by students. Pay attention to:
 * - Database query patterns
 * - Error handling approaches
 * - Network failure resilience
 * - Loading state management
 */

import { mockSupabase } from '../mocks/mockDatabase';
import { mockAssignment, mockSession, mockResponsesStorage } from '../mocks/mockAssignment';
import type {
  HomeworkQuestion,
  HomeworkSession,
  AssignmentWithQuestions,
  QuestionOption,
  OptionWithImage,
  GridQuestionOptions
} from '../mocks/mockAssignment';

// Export types for use in components
export type {
  HomeworkQuestion,
  HomeworkSession,
  AssignmentWithQuestions,
  QuestionOption,
  OptionWithImage,
  GridQuestionOptions
};

// Type guards
export function isOptionWithImage(option: QuestionOption): option is OptionWithImage {
  return typeof option === 'object' && option !== null && typeof (option as any).text === 'string';
}

export function isStringOption(option: QuestionOption): option is string {
  return typeof option === 'string';
}

export function isGridQuestionOptions(options: any): options is GridQuestionOptions {
  return typeof options === 'object' &&
         options !== null &&
         Array.isArray(options.rows) &&
         Array.isArray(options.columns);
}

// Utility functions
export function getOptionText(option: QuestionOption): string {
  if (isStringOption(option)) {
    return option;
  }
  if (isOptionWithImage(option)) {
    return option.text;
  }
  return String(option);
}

export function getOptionImageUrl(option: QuestionOption): string | undefined {
  if (isOptionWithImage(option) && option.image_url) {
    const url = option.image_url.trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:')) {
      return url;
    }
    console.warn('Invalid image URL format:', url);
    return undefined;
  }
  return undefined;
}

/**
 * Get homework assignment with questions
 *
 * ISSUE: Sequential database calls create performance bottleneck
 */
export async function getHomeworkAssignment(assignmentId: number | string): Promise<AssignmentWithQuestions | null> {
  try {
    const assignmentIdNum = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
    if (isNaN(assignmentIdNum)) {
      console.error('Invalid assignment ID:', assignmentId);
      return null;
    }

    // Simulate database fetch
    // NOTE: In production, this makes multiple sequential queries
    const { data: assignment, error: assignmentError } = await (mockSupabase.from('assignments') as any)
      .select()
      .eq('id', assignmentIdNum)
      .single();

    if (assignmentError) {
      console.error('Assignment query error:', assignmentError.message || assignmentError);
      return null;
    }

    if (!assignment) {
      console.error('No assignment found with ID:', assignmentIdNum);
      return null;
    }

    // Return mock assignment (in production, this would fetch from database)
    return mockAssignment;
  } catch (error) {
    console.error('Error in getHomeworkAssignment:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get or create homework session for progress tracking
 *
 * ISSUE: Creates new session even on temporary network failures
 */
export async function getOrCreateHomeworkSession(studentId: string, assignmentId: number | string): Promise<HomeworkSession | null> {
  try {
    const assignmentIdNum = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
    if (isNaN(assignmentIdNum)) {
      console.error('Invalid assignment ID in session:', assignmentId);
      return null;
    }

    // Try to get existing session
    const { data: existingSession, error: sessionError } = await (mockSupabase.from('homework_sessions') as any)
      .select('*')
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentIdNum)
      .maybeSingle();

    if (existingSession && !sessionError) {
      // Update last activity
      await (mockSupabase.from('homework_sessions') as any)
        .update({ last_activity: new Date().toISOString() })
        .eq('id', existingSession.id);

      return existingSession;
    }

    // Log session error if not a "no rows" error
    if (sessionError && (sessionError as any).code !== 'PGRST116') {
      console.error('Error fetching existing session:', sessionError);
    }

    // Create new session
    const { data: newSession, error: createError } = await (mockSupabase.from('homework_sessions') as any)
      .insert({
        student_id: studentId,
        assignment_id: assignmentIdNum,
        current_question_index: 0,
        is_completed: false,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating homework session:', createError.message || createError);
      return null;
    }

    return newSession;
  } catch (error) {
    console.error('Error in getOrCreateHomeworkSession:', error);
    return null;
  }
}

/**
 * Save homework response
 *
 * ISSUE: Silent failures with console.warn instead of user feedback
 * ISSUE: No retry logic for transient failures
 */
export async function saveHomeworkResponse(
  studentId: string,
  questionId: string,
  assignmentId: number | string,
  responseText: string,
  question: HomeworkQuestion,
  sessionId?: string
): Promise<boolean> {
  try {
    const assignmentIdNum = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
    if (isNaN(assignmentIdNum)) {
      console.error('Invalid assignment ID in response:', assignmentId);
      return false;
    }

    // Auto-grade multiple-choice and tickbox questions
    let isCorrect: boolean | undefined;
    let pointsEarned = 0;

    if (question.question_type === 'multiple-choice') {
      const correctAnswer = typeof question.correct_answer === 'string' ? question.correct_answer : '';
      isCorrect = responseText.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === 'tickbox') {
      try {
        const studentAnswers = JSON.parse(responseText);
        const correctAnswers = Array.isArray(question.correct_answer)
          ? question.correct_answer
          : typeof question.correct_answer === 'string'
          ? JSON.parse(question.correct_answer || '[]')
          : [];

        const studentSet = new Set(studentAnswers);
        const correctSet = new Set(correctAnswers);

        const hasAllCorrect = correctAnswers.every((answer: string) => studentSet.has(answer));
        const hasNoIncorrect = studentAnswers.every((answer: string) => correctSet.has(answer));

        isCorrect = hasAllCorrect && hasNoIncorrect;
        pointsEarned = isCorrect ? question.points : 0;
      } catch (e) {
        console.error('Error auto-grading tickbox question:', e);
        isCorrect = false;
        pointsEarned = 0;
      }
    }

    const responseData: any = {
      student_id: studentId,
      question_id: questionId,
      assignment_id: assignmentIdNum,
      response_text: responseText,
      is_correct: isCorrect,
      points_earned: pointsEarned
    };

    if (sessionId) {
      responseData.session_id = sessionId;
    }

    // Save to mock database
    const { error } = await (mockSupabase.from('homework_responses') as any)
      .upsert(responseData, {
        onConflict: 'student_id,question_id,assignment_id'
      });

    if (error) {
      console.error('Error saving homework response:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveHomeworkResponse:', error);
    return false;
  }
}

/**
 * Update homework session progress
 *
 * ISSUE: Called on every question navigation, causing unnecessary network load
 */
export async function updateHomeworkSessionProgress(
  sessionId: string,
  currentQuestionIndex: number,
  isCompleted = false
): Promise<boolean> {
  try {
    const updateData: any = {
      current_question_index: currentQuestionIndex,
      last_activity: new Date().toISOString()
    };

    if (isCompleted) {
      updateData.is_completed = true;
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await (mockSupabase.from('homework_sessions') as any)
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating homework session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateHomeworkSessionProgress:', error);
    return false;
  }
}

/**
 * Get student responses as simple key-value map
 */
export async function getStudentHomeworkResponsesMap(studentId: string, assignmentId: number | string): Promise<Record<string, string | string[]>> {
  try {
    // Return mock responses from storage
    return { ...mockResponsesStorage };
  } catch (error) {
    console.error('Error in getStudentHomeworkResponsesMap:', error);
    return {};
  }
}

/**
 * Submit homework assignment
 *
 * ISSUE: No user feedback if submission partially fails
 */
export async function submitHomeworkAssignment(studentId: string, assignmentId: number | string): Promise<boolean> {
  try {
    const assignmentIdNum = typeof assignmentId === 'string' ? parseInt(assignmentId, 10) : assignmentId;
    if (isNaN(assignmentIdNum)) {
      console.error('Invalid assignment ID in submission:', assignmentId);
      return false;
    }

    // Mark session as completed
    const { error: sessionError } = await (mockSupabase.from('homework_sessions') as any)
      .update({
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentIdNum);

    if (sessionError) {
      console.error('Error completing homework session:', sessionError);
      // Continue anyway - this is a non-critical error
    }

    // Create submission record
    const { error: submissionError } = await (mockSupabase.from('submissions') as any)
      .upsert({
        student_id: studentId,
        assignment_id: assignmentIdNum,
        score: 0.75, // Mock score
        submitted_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,assignment_id'
      });

    if (submissionError) {
      console.error('Error creating submission record:', submissionError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in submitHomeworkAssignment:', error);
    return false;
  }
}

/**
 * Check if student can access assignment
 *
 * NOTE: Simplified for code review - no real enrollment checking
 */
export async function canStudentAccessAssignment(studentId: string, assignmentId: number | string): Promise<boolean> {
  // In production, this checks enrollment
  // For this exercise, always return true
  return true;
}
