/**
 * Mock Assignment Data
 *
 * This file contains sample homework assignment data for the code review exercise.
 * In production, this data comes from the Supabase database.
 */

export interface OptionWithImage {
  text: string;
  image_url?: string;
}

export type QuestionOption = string | OptionWithImage;

export interface GridQuestionOptions {
  rows: string[];
  columns: string[];
}

export interface HomeworkQuestion {
  id: string;
  assignment_id: number;
  question_type: 'multiple-choice' | 'short-answer' | 'long-answer' | 'tickbox' | 'grid';
  question_text: string;
  options?: QuestionOption[] | GridQuestionOptions;
  correct_answer?: string | string[] | Record<string, number>;
  sample_answer?: string;
  image_url?: string;
  image_urls?: string[];
  question_order: number;
  points: number;
  context_text?: string;
  context_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HomeworkSession {
  id: string;
  student_id: string;
  assignment_id: number;
  current_question_index: number;
  is_completed: boolean;
  started_at: string;
  completed_at?: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithQuestions {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  class_code: string;
  questions: HomeworkQuestion[];
  total_points: number;
}

// Mock assignment data
export const mockAssignment: AssignmentWithQuestions = {
  id: 1,
  title: "Science Quiz - Living Things",
  description: "Complete all questions about living organisms and their characteristics. Take your time and read each question carefully.",
  due_date: "2025-10-15T23:59:59Z",
  class_code: "SCI-101",
  total_points: 20,
  questions: [
    {
      id: "q1-uuid-mock",
      assignment_id: 1,
      question_type: "multiple-choice",
      question_text: "What do plants need to grow?",
      options: [
        { text: "Water and sunlight", image_url: undefined },
        { text: "Only water", image_url: undefined },
        { text: "Only soil", image_url: undefined },
        { text: "Nothing", image_url: undefined }
      ],
      correct_answer: "Water and sunlight",
      // NOTE: This image URL may fail to load - testing ReliableImage fallback behavior
      image_url: "https://images.unsplash.com/photo-1416339442236-8ceb164046f8?w=500",
      image_urls: [],
      question_order: 0,
      points: 5,
      context_text: undefined,
      context_image_url: undefined,
      created_at: "2025-09-01T10:00:00Z",
      updated_at: "2025-09-01T10:00:00Z"
    },
    {
      id: "q2-uuid-mock",
      assignment_id: 1,
      question_type: "short-answer",
      question_text: "Name one animal that lives in water.",
      options: undefined,
      correct_answer: "Fish",
      sample_answer: "Examples: Fish, Dolphin, Whale, Octopus",
      image_url: undefined,
      image_urls: [],
      question_order: 1,
      points: 5,
      context_text: undefined,
      context_image_url: undefined,
      created_at: "2025-09-01T10:00:00Z",
      updated_at: "2025-09-01T10:00:00Z"
    },
    {
      id: "q3-uuid-mock",
      assignment_id: 1,
      question_type: "tickbox",
      question_text: "Select all living things from the list below:",
      options: [
        "Tree",
        "Rock",
        "Dog",
        "Car",
        "Flower",
        "Cloud"
      ],
      correct_answer: ["Tree", "Dog", "Flower"],
      image_url: undefined,
      image_urls: [],
      question_order: 2,
      points: 10,
      context_text: undefined,
      context_image_url: undefined,
      created_at: "2025-09-01T10:00:00Z",
      updated_at: "2025-09-01T10:00:00Z"
    }
  ]
};

// Mock session data
export const mockSession: HomeworkSession = {
  id: "session-123-uuid",
  student_id: "student-user-123",
  assignment_id: 1,
  current_question_index: 0,
  is_completed: false,
  started_at: "2025-09-30T10:00:00Z",
  completed_at: undefined,
  last_activity: "2025-09-30T10:15:00Z",
  created_at: "2025-09-30T10:00:00Z",
  updated_at: "2025-09-30T10:15:00Z"
};

// Mock user
export const mockUser = {
  id: "student-user-123",
  email: "student@example.com",
  role: "student"
};

// Storage for mock responses (simulates database)
export const mockResponsesStorage: Record<string, string | string[]> = {};
