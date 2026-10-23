# Authentication and user profile changes

## Suggested commit message

```text
feat(auth): require login and show the authenticated user profile

- Protect application routes and connect login and registration to FastAPI.
- Use a shared backend URL and fix API paths used by frontend screens.
- Load and update the signed-in user's profile from the database.
- Add the users table schema and pin compatible authentication dependencies.
```

## Files changed

| File | Changes |
| --- | --- |
| `backend/requirements.txt` | Declare authentication dependencies and pin `bcrypt==4.0.1` for compatibility with Passlib. |
| `backend/src/api/routes/auth.py` | Keep login and registration paths consistent with the `/auth` prefix configured by the API router. |
| `backend/src/api/routes/user.py` | Replace the shared sample profile with JWT-authenticated profile lookup and update for the current database user. Reject duplicate emails, and change passwords only after verifying the current password. |
| `backend/src/repositories/user_repository.py` | Add user lookup by UUID and saving updates. |
| `data/02_database_schema.sql` | Add the PostgreSQL `users` table schema used for registration and profile data. |
| `frontend/.env.example` | Set the example backend URL to `http://127.0.0.1:8000`. |
| `frontend/src/api/config.ts` | Centralize the frontend backend URL, supporting `VITE_API_URL` and the legacy `VITE_API_BASE_URL`. |
| `frontend/src/api/authApi.ts` | Connect registration and login to FastAPI; keep the access token in session storage and expose token and logout helpers. |
| `frontend/src/api/emotionApi.ts` | Use the shared backend URL and call the actual `/health/` route. |
| `frontend/src/services/api.ts` | Use the shared backend URL and send the bearer token when reading or updating the user's profile. |
| `frontend/src/services/historyApi.ts` | Use the shared backend URL and send the history filter as `type`, matching the backend route. |
| `frontend/src/routes/AppRoutes.tsx` | Redirect unauthenticated visitors to login, preserve their requested destination, and redirect the old `/auth` page to `/login`. |
| `frontend/src/pages/LoginPage.tsx` | Submit credentials to the backend, display API errors, and return to the requested page after login. |
| `frontend/src/pages/RegisterPage.tsx` | Register through the backend and direct successful registrations to login. |
| `frontend/src/pages/SettingsPage.tsx` | Load the signed-in user's profile, show loading/errors, save profile updates, and clear the token on logout. |
| `frontend/src/components/layout/AppLayout.tsx` | Load the authenticated user's profile instead of showing a hard-coded sample account. |
| `frontend/src/components/ChatbotWidget.tsx` | Use the shared backend URL for chatbot requests. |
| `README.md` | Document the frontend backend URL and authentication endpoints. |

## Notes

- Restart the backend after installing the requirements or changing backend code.
- The frontend route guard controls page navigation; profile endpoints independently validate the bearer token.
- Avatar and role are not stored in the current `users` table, so the profile API returns empty avatar and the default `User` role.
