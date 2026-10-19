# CampusFind – Campus Lost & Found System

## Project Overview

CampusFind is a web-based Campus Lost & Found System that helps students report lost or found items within a campus. Users can create item reports, upload photographs, search and filter listings, and manage their own reports.

The application is deployed online and uses a database to persist reports and cloud storage for uploaded images.

## Features

- User registration and login
- Secure password hashing and JWT-based authentication
- Create lost and found item reports
- Upload and display item photographs
- Search and filter item listings
- View items reported by the logged-in user
- Edit and delete reports with ownership restrictions
- Persistent data storage
- Online deployment

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Vite | Frontend development and build tool |
| HTML and CSS | Page structure and styling |
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB Atlas | Database |
| Mongoose | MongoDB object modelling |
| Cloudinary | Image storage |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Git and GitHub | Version control and source code hosting |
| Vercel | Frontend hosting |
| Render | Backend hosting |

## System Architecture

1. The React frontend provides the user interface.
2. The frontend communicates with the Express backend through HTTP API requests.
3. The backend authenticates users and processes item-related operations.
4. MongoDB Atlas stores user and item information.
5. Cloudinary stores uploaded images and provides image URLs.
6. Vercel hosts the frontend, while Render hosts the backend.

## Live Application

- **Frontend:** https://campus-lost-found-tan-eight.vercel.app/
- **Backend:** https://campusfind-api-far2.onrender.com
- **GitHub Repository:** https://github.com/tanmayi09/campus-lost-found

## Project Structure

```text
campus-lost-found/
├── backend/
│   ├── models/
│   │   ├── Item.js
│   │   └── User.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Local Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB Atlas account
- Cloudinary account
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/campus-lost-found.git
cd campus-lost-found
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory and configure the following variables using your own credentials:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the backend:

```bash
npm start
```

### 3. Set up the frontend

Open a separate terminal from the project root:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL displayed in the terminal, usually `http://localhost:5173`.

## Security Notes

- Never commit `.env` files or API secrets to GitHub.
- Passwords are hashed before storage.
- Protected operations require authentication.
- Editing and deleting reports are restricted to their original reporter.

## Testing

The deployed application has been tested for:

- User registration and login
- Item report creation
- Image uploads and persistence after refresh

Additional functionality, including search, filtering, editing, and ownership restrictions, should be tested during final validation.

## Future Enhancements

- Email notifications for matching lost and found items
- Advanced search by category and location
- Item claim and verification workflow
- Administrative dashboard
- Improved mobile responsiveness

## Author

Developed as an academic project to improve the management of lost and found items on campus.
