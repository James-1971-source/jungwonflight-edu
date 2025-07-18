# Educational Video Platform Migration

## Project Overview
This is a comprehensive educational video platform with user management, video categorization, progress tracking, and note-taking features. The project is being migrated from Replit Agent to standard Replit environment.

## Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **File Storage**: Local filesystem with multer

## Recent Changes
- **Migration Completed**: Successfully migrated from Replit Agent to Replit environment
- **Database Setup**: Created PostgreSQL database and migrated all tables
- **Railway Issues Fixed**: Resolved multiple deployment issues including:
  - Healthcheck endpoint optimization
  - Session cookie configuration for production
  - Database connection settings for different environments
  - Migration logic improvements
- **Environment Configuration**: Updated settings for both Replit and Railway compatibility

## User Preferences
- Language: Korean (based on console logs and comments)
- Environment: Development focus with production deployment capabilities

## Features
- User registration and authentication
- Video upload and management
- Category-based organization
- Progress tracking for users
- Note-taking functionality
- Admin approval system for users

## Current Status
- Migration in progress
- Database connection being configured
- Server setup being optimized for Replit environment