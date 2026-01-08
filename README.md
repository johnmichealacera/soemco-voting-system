# SOEMCO Voting System

A comprehensive cooperative voting system web application built with Next.js, TypeScript, and PostgreSQL.

## Technology Stack

- **Framework**: Next.js 15.5.9 with App Router
- **Frontend**: React 19.1.0, TypeScript 5.x
- **Database**: PostgreSQL with Prisma ORM v6.16.3
- **Authentication**: NextAuth.js v4.24.11 with Prisma adapter
- **Styling**: Tailwind CSS v4, Radix UI components
- **Forms**: React Hook Form v7.64.0 with Zod validation
- **State Management**: TanStack Query v5.90.5
- **Icons**: Lucide React v0.545.0
- **Notifications**: Sonner v2.0.7

## Features

### User Roles

1. **MEMBER** - Regular cooperative member
   - View available elections
   - Cast votes in active elections
   - View election results
   - Update personal profile

2. **BOARD_MEMBER** - Board of Directors
   - All MEMBER permissions
   - Create and manage elections
   - Manage candidate nominations
   - Approve election proposals

3. **ELECTION_COMMITTEE** - Election oversight committee
   - All BOARD_MEMBER permissions
   - Configure voting parameters
   - Manage voter eligibility
   - Oversee voting integrity
   - Certify election results

4. **ADMIN** - System administrator
   - All permissions across the system
   - User management and role assignments
   - System configuration
   - Data backup and maintenance

### Core Features

- **Election Management**: Create and manage elections with configurable parameters
- **Candidate Management**: Nomination and registration system
- **Secure Voting**: Anonymous voting with unique tokens
- **Results & Reporting**: Live result aggregation and detailed statistics
- **Workflow Engine**: Approval workflows for election processes
- **Audit Trails**: Complete audit logging for all operations
- **Notifications**: Comprehensive notification system

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd soemco-voting-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_URL`: Your application URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET`: A random secret string for JWT signing

4. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **User**: Authentication and user accounts
- **MemberProfile**: Member information and status
- **Election**: Election campaigns and configuration
- **Position**: Positions within elections
- **Candidate**: Candidate nominations
- **Vote**: Anonymous vote records
- **ElectionResult**: Aggregated election results
- **AuditTrail**: Complete audit logging
- **Notification**: User notifications
- **WorkflowTemplate/Instance/Step**: Workflow engine

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── elections/         # Election management
│   ├── voting/            # Voting interface
│   └── ...
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   ├── dashboard/        # Dashboard components
│   └── ...
├── lib/                  # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── prisma.ts         # Database client
│   ├── workflow-engine.ts # Workflow system
│   └── ...
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio

### Creating a New User

You can create a user via the registration API or directly in the database. For development, you can use Prisma Studio:

```bash
npm run db:studio
```

Or create a seed script to populate initial data.

## Security Features

- Role-based access control (RBAC)
- Secure password hashing with bcrypt
- JWT-based session management
- Anonymous voting with unique tokens
- Complete audit trails
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]

## Support

For support, please contact [your contact information].

