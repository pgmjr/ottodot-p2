# Homework Submission Flow - Code Review Exercise

## 📋 Overview

This is an **isolated module** from the Ottodot Learning Management System (LMS), containing only the homework submission flow. This code is experiencing reliability and performance issues reported by students, and your task is to analyze it and propose improvements.

## 🎯 Your Task

As a full-stack developer candidate, you will:

1. **Analyze** the provided codebase to identify performance and reliability issues
2. **Propose** a prioritized improvement plan for your first month
3. **Identify** quick wins that could be implemented in your first week

**No coding required** - this is a code review and planning exercise.

## 🐛 Reported Issues

Students have reported the following problems with the homework submission page:

### Performance Issues
- ⏱️ **Slow page loads**: Sometimes takes 5-10 seconds to display the first question
- 🖼️ **Image loading failures**: Question images occasionally show "Image not available" placeholder
- 🔄 **Laggy navigation**: Switching between questions feels sluggish

### Reliability Issues
- ❌ **Silent save failures**: Answers sometimes fail to save with no error message to the user
- 💾 **Progress not saved**: After navigating away and returning, students sometimes lose their progress
- 🚫 **Submission failures**: Final submission occasionally fails without clear feedback

## 📂 Codebase Structure

```
homework-review-exercise/
├── components/
│   └── ReliableImage.tsx          # Image component with fallback system
├── lib/
│   ├── homeworkUtils.ts           # Core homework business logic
│   ├── supabaseClient.ts          # Database client (mocked)
│   ├── analytics.ts               # Analytics tracking (simplified)
│   └── placeholderImage.ts        # SVG placeholder for failed images
├── mocks/
│   ├── mockAssignment.ts          # Sample assignment data
│   └── mockDatabase.ts            # Mock database with simulated delays/failures
├── pages/
│   ├── index.tsx                  # Landing page (auto-redirects)
│   ├── student/
│   │   ├── index.tsx              # Student dashboard (simplified)
│   │   └── assignment/
│   │       └── [id].tsx           # ⭐ MAIN HOMEWORK PAGE - Start here
└── README.md                      # This file
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the Application

Open your browser to [http://localhost:3000](http://localhost:3000)

The app will auto-redirect to the homework assignment page at:
`http://localhost:3000/student/assignment/1`

## 🔍 What to Review

### Primary Focus
Start with **`pages/student/assignment/[id].tsx`** - this is the main homework submission interface where the reported issues occur.

### Supporting Files
- **`lib/homeworkUtils.ts`** - Contains database query logic and business rules
- **`components/ReliableImage.tsx`** - Handles image loading with fallback system
- **`mocks/mockDatabase.ts`** - Simulates network delays and occasional failures

### Key Areas to Investigate
1. **Data loading patterns** (lines 40-101 in [id].tsx)
2. **Error handling approaches** (look for `console.warn` and `console.error`)
3. **State management** and when re-renders occur
4. **Network request patterns** (sequential vs parallel, retry logic)
5. **User feedback** for loading/error states

## ❓ Assessment Questions

Please provide written answers to the following questions:

### Question 1: Top 3 Concerns
**What are the top 3 areas of concern in the existing prototype that likely impact performance and reliability?**

For each concern:
- Describe the specific issue
- Explain the root cause
- Estimate the severity (High/Medium/Low)
- Reference relevant file(s) and line numbers

### Question 2: One-Month Roadmap
**Outline the steps you would take over your first month to improve the prototype. What would you prioritize and why?**

Structure your answer as a week-by-week plan:
- Week 1: Quick wins and immediate fixes
- Week 2: Medium-term improvements
- Week 3-4: Architectural enhancements

For each item, explain:
- What you would do
- Why it's prioritized at that point
- Expected impact on users

### Question 3: Quick Wins
**Identify one or two specific, small changes you could implement in your first week for an immediate improvement.**

For each quick win:
- Describe the change in detail
- Explain why it's a quick win (low effort, high impact)
- Estimate implementation time
- Describe how you would verify the improvement

## 🧪 Testing the Mock System

The mock database in `mocks/mockDatabase.ts` simulates real-world conditions:

### Simulated Behaviors
- **Random network delays**: 500ms - 3000ms per request
- **Occasional failures**: ~10% failure rate to test error handling
- **State persistence**: Mock responses stored in-memory

### How to Observe Issues
1. **Slow loading**: Refresh the page multiple times - you'll see varying load times
2. **Image failures**: The question image URL may fail to load, testing `ReliableImage` fallback
3. **Save failures**: Watch browser console for simulated network errors

## 📝 Technical Context

### Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **State**: React hooks (useState, useEffect)
- **Database**: Supabase PostgreSQL (mocked for this exercise)

### Production Architecture (FYI)
In production, this connects to:
- Supabase PostgreSQL database with Row Level Security (RLS)
- PostHog for analytics
- Supabase Storage for image hosting

All external dependencies have been mocked for this exercise.

## 🔒 What's Been Simplified

For this code review exercise, we've removed:
- Real authentication (auto-logged in as mock student)
- Admin/parent portals
- MCQ practice system
- Grading interfaces
- Analytics integration (just console logs)
- Real database connections

## 💡 Hints

Look for these patterns in the code:

### Performance Red Flags
- Sequential `await` calls that could be parallel
- Missing loading states or skeletons
- Expensive operations in render functions
- Unnecessary re-fetching of data

### Reliability Red Flags
- Error handling with `console.warn` instead of user feedback
- No retry logic for transient failures
- Silent failures (function returns `false` but UI doesn't show error)
- Missing error boundaries

### Code Quality Red Flags
- Duplicated logic across functions
- Magic numbers or strings
- Complex conditional logic
- Tightly coupled components

## 📧 Submission

Please submit your written answers in a document (PDF, Markdown, or Google Doc) addressing all three assessment questions.

Focus on demonstrating:
- ✅ Deep understanding of full-stack architecture
- ✅ Ability to prioritize and make trade-offs
- ✅ Clear communication of technical concepts
- ✅ Practical problem-solving approach

## 🤔 Questions?

If you have questions about the assessment:
- Review the inline code comments (marked with `NOTE` and `ISSUE`)
- Check the browser console for simulated errors
- Refer back to the "Reported Issues" section

Good luck! We're excited to see your analysis. 🚀
