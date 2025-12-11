import { Course, Lesson, Assignment, Quiz, QuizQuestion, Note, Analytics } from '@/types';

export const mockCourses: Course[] = [
  {
    id: '1',
    teacherId: '2',
    teacherName: 'Sarah Teacher',
    title: 'Introduction to Web Development',
    description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites.',
    category: 'Programming',
    thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop',
    enrolledCount: 156,
    lessonsCount: 12,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    teacherId: '2',
    teacherName: 'Sarah Teacher',
    title: 'Data Science Fundamentals',
    description: 'Master the basics of data analysis, visualization, and machine learning concepts.',
    category: 'Data Science',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop',
    enrolledCount: 89,
    lessonsCount: 8,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '3',
    teacherId: '2',
    teacherName: 'Sarah Teacher',
    title: 'Digital Marketing Essentials',
    description: 'Learn SEO, social media marketing, and content strategy from industry experts.',
    category: 'Marketing',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
    enrolledCount: 234,
    lessonsCount: 15,
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    teacherId: '2',
    teacherName: 'Sarah Teacher',
    title: 'Python for Beginners',
    description: 'Start your programming journey with Python - the most beginner-friendly language.',
    category: 'Programming',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop',
    enrolledCount: 312,
    lessonsCount: 20,
    createdAt: new Date('2024-03-01'),
  },
];

export const mockLessons: Lesson[] = [
  {
    id: '1',
    courseId: '1',
    title: 'Getting Started with HTML',
    content: 'In this lesson, we will learn the basics of HTML structure and common tags.',
    resourceType: 'video',
    resourceLink: 'https://example.com/video1',
    duration: 45,
    order: 1,
  },
  {
    id: '2',
    courseId: '1',
    title: 'CSS Fundamentals',
    content: 'Learn how to style your web pages with CSS selectors and properties.',
    resourceType: 'video',
    resourceLink: 'https://example.com/video2',
    duration: 60,
    order: 2,
  },
  {
    id: '3',
    courseId: '1',
    title: 'JavaScript Basics',
    content: 'Introduction to JavaScript programming and DOM manipulation.',
    resourceType: 'pdf',
    resourceLink: 'https://example.com/js-basics.pdf',
    order: 3,
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: '1',
    courseId: '1',
    title: 'Build a Personal Portfolio',
    instructions: 'Create a responsive personal portfolio website using HTML, CSS, and JavaScript.',
    dueDate: new Date('2024-12-20'),
    status: 'open',
    maxScore: 100,
  },
  {
    id: '2',
    courseId: '1',
    title: 'CSS Grid Layout Exercise',
    instructions: 'Implement a complex layout using CSS Grid.',
    dueDate: new Date('2024-12-15'),
    status: 'open',
    maxScore: 50,
  },
  {
    id: '3',
    courseId: '2',
    title: 'Data Visualization Project',
    instructions: 'Create visualizations using Python matplotlib library.',
    dueDate: new Date('2024-12-25'),
    status: 'open',
    maxScore: 100,
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: '1',
    courseId: '1',
    title: 'HTML Fundamentals Quiz',
    totalMarks: 20,
    duration: 15,
    questionsCount: 10,
  },
  {
    id: '2',
    courseId: '1',
    title: 'CSS Selectors Quiz',
    totalMarks: 30,
    duration: 20,
    questionsCount: 15,
  },
  {
    id: '3',
    courseId: '2',
    title: 'Python Basics Quiz',
    totalMarks: 25,
    duration: 25,
    questionsCount: 12,
  },
];

export const mockQuizQuestions: QuizQuestion[] = [
  {
    id: '1',
    quizId: '1',
    questionText: 'What does HTML stand for?',
    options: [
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Hyper Transfer Markup Language',
      'Home Tool Markup Language',
    ],
    correctAnswer: 0,
    marks: 2,
  },
  {
    id: '2',
    quizId: '1',
    questionText: 'Which tag is used for the largest heading in HTML?',
    options: ['<h6>', '<heading>', '<h1>', '<head>'],
    correctAnswer: 2,
    marks: 2,
  },
  {
    id: '3',
    quizId: '1',
    questionText: 'What is the correct HTML element for inserting a line break?',
    options: ['<break>', '<lb>', '<br>', '<newline>'],
    correctAnswer: 2,
    marks: 2,
  },
  {
    id: '4',
    quizId: '1',
    questionText: 'Which attribute specifies an alternate text for an image?',
    options: ['title', 'alt', 'src', 'href'],
    correctAnswer: 1,
    marks: 2,
  },
  {
    id: '5',
    quizId: '1',
    questionText: 'What is the correct HTML for creating a hyperlink?',
    options: [
      '<a url="http://example.com">',
      '<a href="http://example.com">',
      '<link href="http://example.com">',
      '<hyperlink="http://example.com">',
    ],
    correctAnswer: 1,
    marks: 2,
  },
];

export const mockNotes: Note[] = [
  {
    id: '1',
    courseId: '1',
    title: 'HTML Cheat Sheet',
    content: `# HTML Cheat Sheet

## Basic Structure
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
</head>
<body>
    <!-- Content here -->
</body>
</html>
\`\`\`

## Common Tags
- **<h1> to <h6>**: Headings
- **<p>**: Paragraph
- **<a>**: Anchor/Link
- **<img>**: Image
- **<div>**: Division
- **<span>**: Inline container

## Forms
- **<form>**: Form container
- **<input>**: Input field
- **<button>**: Button
- **<select>**: Dropdown`,
    fileType: 'text',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    courseId: '1',
    title: 'CSS Flexbox Guide',
    content: `# CSS Flexbox Complete Guide

## Container Properties
- **display: flex** - Creates flex container
- **flex-direction** - row | column
- **justify-content** - Horizontal alignment
- **align-items** - Vertical alignment
- **flex-wrap** - wrap | nowrap

## Item Properties
- **flex-grow** - Growth factor
- **flex-shrink** - Shrink factor
- **flex-basis** - Base size
- **align-self** - Individual alignment`,
    fileType: 'text',
    createdAt: new Date('2024-01-20'),
  },
];

export const mockAnalytics: Analytics = {
  totalUsers: 1250,
  totalStudents: 1100,
  totalTeachers: 45,
  totalCourses: 89,
  totalEnrollments: 3456,
  activeUsers: 234,
  quizPerformance: {
    averageScore: 76.5,
    totalAttempts: 2340,
  },
  assignmentStats: {
    totalSubmissions: 1890,
    averageGrade: 82.3,
  },
  userActivity: [
    { hour: 0, count: 12 },
    { hour: 1, count: 8 },
    { hour: 2, count: 5 },
    { hour: 3, count: 3 },
    { hour: 4, count: 4 },
    { hour: 5, count: 8 },
    { hour: 6, count: 25 },
    { hour: 7, count: 45 },
    { hour: 8, count: 78 },
    { hour: 9, count: 120 },
    { hour: 10, count: 145 },
    { hour: 11, count: 132 },
    { hour: 12, count: 98 },
    { hour: 13, count: 112 },
    { hour: 14, count: 156 },
    { hour: 15, count: 189 },
    { hour: 16, count: 167 },
    { hour: 17, count: 134 },
    { hour: 18, count: 98 },
    { hour: 19, count: 87 },
    { hour: 20, count: 76 },
    { hour: 21, count: 54 },
    { hour: 22, count: 34 },
    { hour: 23, count: 18 },
  ],
};
