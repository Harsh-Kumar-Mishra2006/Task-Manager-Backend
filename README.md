# Task Manager Backend API

A production-ready RESTful Task Manager Backend built with **Node.js**, **Express.js**, and **MongoDB**. This project provides complete CRUD functionality for task management with input validation, filtering, pagination, security middleware, centralized error handling, and clean project architecture.

---

# Table of Contents

- Overview
- Features
- Tech Stack
- Project Structure
- Database Schema
- API Endpoints
- Validation & Security
- Installation
- Environment Variables
- Running the Project
- Example API Requests
- Future Improvements
- Author

---

# Overview

The Task Manager Backend is designed following RESTful API principles and clean architecture. It allows users to create, update, retrieve, and delete tasks while ensuring data integrity through validation and middleware.

The application includes:

- Complete CRUD Operations
- Pagination
- Filtering
- Sorting
- MongoDB Validation
- Express Validation
- Centralized Error Handling
- Security Middleware
- Clean Folder Structure

---

# Features

## Task Management

- Create Task
- Get All Tasks
- Get Task by ID
- Update Task
- Delete Task
- Bulk Delete Tasks

---

## Filtering & Pagination

Supports filtering tasks by:

- Status
- Priority

Supports pagination using:

- page
- limit

Supports sorting by:

- createdAt
- title
- status
- priority
- dueDate

Ascending and descending order supported.

---

## Validation

Input validation using **Express Validator**

Validation includes:

- Required title
- Minimum title length
- Maximum title length
- Description length
- Valid status
- Valid priority
- Future due date
- Tag validation
- MongoDB ObjectId validation

---

## Security

Implemented security features include:

- Helmet
- CORS
- Input Sanitization
- Centralized Error Handling
- MongoDB Schema Validation

---

## Statistics Endpoint

Provides aggregated statistics for tasks grouped by status.

---

## Health Check Endpoint

Health endpoint to verify server status.

```
GET /api/health
```

---

# Tech Stack

Backend

- Node.js
- Express.js

Database

- MongoDB
- Mongoose

Validation

- Express Validator

Security

- Helmet
- CORS

Environment

- dotenv

---

# Project Structure

```
TaskManager/
│
├── backend/
│
├── config/
│   └── database.js
│
├── controllers/
│   └── taskController.js
│
├── middleware/
│   ├── errorHandler.js
│   └── validation.js
│
├── models/
│   └── Task.js
│
├── routes/
│   └── taskRoutes.js
│
├── utils/
│   └── validators.js
│
├── .env
├── package.json
├── server.js
└── README.md
```

---

# Database Schema

## Task Schema

```
Task

id

title

description

status

priority

dueDate

tags[]

createdAt

updatedAt
```

---

## Status Values

```
pending

in-progress

completed
```

---

## Priority Values

```
low

medium

high
```

---

# API Endpoints

Base URL

```
https://colledge-connect-assignment-backend.onrender.com/api/tasks
```

---

## Create Task

```
POST /
```

Example Request

```json
{
  "title": "Complete Backend Assignment",
  "description": "Finish Task Manager API",
  "priority": "high",
  "status": "pending",
  "dueDate": "2026-07-15",
  "tags": ["node", "backend"]
}
```

---

## Get All Tasks

```
GET /
```

Optional Query Parameters

```
?page=1

&limit=10

&status=pending

&priority=high

&sortBy=createdAt

&sortOrder=desc
```

---

## Get Task By ID

```
GET /:id
```

---

## Update Task

```
PUT /:id
```

Example

```json
{
  "status": "completed"
}
```

---

## Delete Task

```
DELETE /:id
```

---

## Bulk Delete Tasks

```
DELETE /bulk/delete
```

---

## Task Statistics

```
GET /stats
```

Returns number of tasks grouped by status.

---

## Health Check

```
GET /api/health
```

Returns server status.

---

# Request Validation

Validation is performed using **Express Validator**.

Validated Fields

| Field       | Validation                          |
| ----------- | ----------------------------------- |
| title       | Required, 3–100 characters          |
| description | Maximum 500 characters              |
| status      | pending, in-progress, completed     |
| priority    | low, medium, high                   |
| dueDate     | Must be a future date               |
| tags        | Array with each tag ≤ 20 characters |
| id          | Valid MongoDB ObjectId              |

Invalid requests return

```
400 Bad Request
```

---

# Security Features

## Helmet

Adds secure HTTP headers.

---

## CORS

Allows requests only from configured frontend origins.

---

## Input Sanitization

Removes HTML characters from

- Title
- Description

to reduce XSS risks.

---

## Centralized Error Handling

Handles

- Validation Errors
- MongoDB Errors
- Duplicate Fields
- Invalid Object IDs
- Unexpected Server Errors

---

# Mongoose Features Used

The Task model includes advanced Mongoose functionality.

### Validation

- Required Fields
- Enum Validation
- Length Validation
- Custom Due Date Validation

---

### Indexing

Indexes created on

```
status

priority

createdAt
```

to improve query performance.

---

### Middleware

Pre-save middleware automatically capitalizes the first letter of the task title.

---

### Virtual Property

```
ageInDays
```

Returns the number of days since the task was created.

---

### Instance Method

```
markAsCompleted()
```

Marks a task as completed.

---

### Static Method

```
getStats()
```

Returns aggregated statistics grouped by task status.

---

### JSON Transformation

Automatically removes

```
_id

__v
```

and exposes

```
id
```

for cleaner API responses.

---

# Installation

Clone the repository

```bash
git clone <https://github.com/Harsh-Kumar-Mishra2006/CollEdge_Connect-Assignment_backend>
```

Navigate to backend

```bash
cd backend
```

Install dependencies

```bash
npm install
```

---

# Running the Project

Development

```bash
npm run dev
```

Production

```bash
npm start
```

Server

```
https://colledge-connect-assignment-backend.onrender.com
```

---

# Example API Flow

```
Start Server

↓

Connect MongoDB

↓

Create Task

↓

Retrieve Tasks

↓

Update Task

↓

View Statistics

↓

Delete Task
```

---

# Example Response

```json
{
  "status": "success",
  "data": {
    "id": "685fd5f...",
    "title": "Complete Backend Assignment",
    "description": "Finish Task Manager API",
    "status": "pending",
    "priority": "high",
    "dueDate": "2026-07-15T00:00:00.000Z",
    "tags": ["node", "backend"],
    "createdAt": "2026-06-28T10:20:30.000Z",
    "updatedAt": "2026-06-28T10:20:30.000Z"
  }
}
```

---

# Future Improvements

- User Authentication (JWT)
- User-specific Tasks
- Soft Delete
- Task Categories

---

# Author

**Harsh Kumar Mishra**

Task Manager Backend API
