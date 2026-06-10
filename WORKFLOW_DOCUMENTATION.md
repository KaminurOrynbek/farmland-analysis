# Farmland Analysis Workflow Documentation

This document explains how the current application works according to the implemented frontend and backend logic in this repository.

It is based on the code in:

- `frontend/src/App.jsx`
- `frontend/src/pages/*`
- `frontend/src/components/workspace/*`
- `frontend/src/api/client.js`
- `backend/main.py`
- `backend/routers/*`
- `backend/services/*`
- `backend/use_cases/analyze_field.py`
- `backend/infrastructure/*`

## 1. System Overview

The project is a single-page React frontend connected to a FastAPI backend.

At a high level:

1. The frontend manages the user session, page navigation, field selection, map interaction, and report display.
2. The backend handles authentication, field storage, access control, comments, admin operations, and analysis job orchestration.
3. Heavy analysis runs asynchronously through Celery workers.
4. Analysis progress is pushed through Redis and WebSocket updates, while the frontend also polls as a fallback.

## 2. Frontend Workflow

## 2.1 Frontend Entry Flow

Frontend bootstrap:

- `frontend/src/main.jsx` renders `App`.
- `frontend/src/App.jsx` is the central controller for the whole SPA.

When the app starts, `App.jsx` does two important things:

1. It checks backend health with `checkHealth()` and refreshes that health flag every 30 seconds.
2. It restores the user session from `localStorage` and then validates it by calling `fetchCurrentUser()`.

Session storage usage:

- `localStorage.token`: JWT access token
- `localStorage.user`: last known user object
- `sessionStorage.authRedirect`: used after forced logout on `401`
- `sessionStorage.workspaceGuidePendingAfterRegistration`: used to open the guided workflow after registration

The app has three top-level views:

- `landing`
- `auth`
- `app`

If there is no valid token, the user stays on `landing` or `auth`.
If the token is valid, the user enters the authenticated app shell.

## 2.2 Frontend Navigation Model

After login, the user moves inside one persistent shell:

- `AppSidebar`
- `AppHeader`
- page content selected by `activePage`

Main authenticated pages:

- `Dashboard`
- `Workspace`
- `My Farm`
- `Analysis Report`
- `Field Sharing`
- `Profile / Settings`
- `Admin Panel` for admins only

`App.jsx` owns the shared state and passes it into pages as props. This means the workspace, project list, and report page all reuse the same current field and current analysis context.

## 2.3 Authentication Workflow

Authentication UI lives in `frontend/src/pages/AuthPage.jsx`.

### Registration flow

1. User selects register mode.
2. Frontend submits `email`, `password`, `fullName`, and `role` to `POST /api/auth/register`.
3. On success, the UI switches back to login mode.
4. The login form is prefilled with the newly created credentials.
5. A session flag is set so the workspace guide can open after first login.

Important behavior:

- The frontend only offers `FARMER` and `AGRONOMIST` roles during self-registration.

### Login flow

1. User submits email and password.
2. `loginUser()` sends form-encoded credentials to `POST /api/auth/login`.
3. The returned JWT is stored in `localStorage.token`.
4. The frontend immediately calls `GET /api/users/me`.
5. The returned user profile is stored in `localStorage.user`.
6. `App.jsx` updates `sessionUser`, switches to `app`, and opens `Dashboard` or `Workspace`.

### Auth persistence and logout

- Every Axios request automatically attaches `Authorization: Bearer <token>`.
- If any non-auth request returns `401`, the frontend clears local auth data and reloads the app.
- Manual logout simply removes token and user from storage and returns to landing.

## 2.4 Workspace Workflow

The workspace is the main operational page.

Key files:

- `frontend/src/pages/WorkspacePage.jsx`
- `frontend/src/components/workspace/FieldControlPanel.jsx`
- `frontend/src/components/workspace/FieldMap.jsx`
- `frontend/src/components/workspace/FieldCommentsPanel.jsx`

The workspace combines:

- field upload or drawing
- field save
- satellite metadata fetch
- analysis trigger
- map display
- recent field context
- comments

### A. Workspace page load

When `WorkspacePage` mounts or `refreshKey` changes:

1. It requests all accessible fields with `GET /api/geo/fields`.
2. It requests analysis history with `GET /api/analysis/history`.
3. It merges both datasets into workspace summaries.
4. It resolves the currently selected field summary and its latest analysis.

If backend requests fail, the page falls back to local in-memory field context where possible.

### B. Upload GeoJSON flow

The left control panel handles file upload.

Process:

1. User chooses a `.geojson` or `.json` file.
2. The file is read locally in the browser using `FileReader`.
3. The geometry is normalized into a `FeatureCollection`.
4. The first feature becomes the selected field.
5. The field is not yet saved to the backend at this stage.

State updated in the frontend:

- `geoJsonData`
- `geoJsonMeta`
- `selectedField`
- `fieldName`
- `geoJsonUploadResponse` is cleared because this is still unsaved

### C. Draw field flow

Map drawing uses Leaflet + Geoman.

Process:

1. User draws a polygon or rectangle on the map.
2. The drawn layer is converted to GeoJSON.
3. The drawn geometry is stored as pending local state.
4. A naming modal opens.
5. If saved, the geometry goes through the same backend save flow as uploaded GeoJSON.
6. If canceled, the previous workspace state is restored.

### D. Save field flow

Saving is triggered by `onSaveField` or `onSaveDrawnField`.

Process:

1. Frontend validates that field name and geometry exist.
2. It calls `POST /api/geo/fields`.
3. On success, backend response data is merged into the first feature's properties.
4. The saved field becomes the active selected field.
5. `refreshKey` is incremented so field lists and history elsewhere can refresh.

After save, the frontend now has a stable backend field id.

### E. Fetch satellite metadata flow

This is a lightweight metadata request, not the full analysis.

Process:

1. Frontend computes the bounding box from the current geometry.
2. It calls `POST /api/satellite/fetch-satellite-data` with:
   - dataset
   - bbox
3. The response is stored against the current field key.

Current implementation detail:

- This backend route returns simulated metadata only.
- It does not store imagery and does not start analysis.

### F. Run analysis flow

This is the main frontend workflow.

Process:

1. Frontend checks that a saved field id exists.
2. Frontend calls `POST /api/analysis/analyze`.
3. It currently sends hardcoded dates:
   - `2023-05-01`
   - `2023-08-30`
4. The returned `analysis_id` is stored in frontend state.
5. The UI enters analyzing mode and displays progress messaging.

Then the frontend tracks progress using two channels:

1. WebSocket subscription: `/api/analysis/ws/{userId}?token=<jwt>`
2. Polling fallback: `GET /api/analysis/status/{analysis_id}`

The frontend loops until one of these happens:

- status becomes `DONE`
- status becomes `FAILED`
- progress reaches `100`

When finished:

1. The frontend requests `GET /api/analysis/history`.
2. It searches for the completed item with the same `analysis_id`.
3. It normalizes that result into UI-friendly fields:
   - vegetation health
   - crop type
   - confidence
   - area
   - NDVI/EVI
   - stress zone counts
   - risk level
   - agronomic assessment
   - recommendations
4. It stores that as the current report state.
5. It increments `refreshKey` so the rest of the app can refresh lists and metrics.

### G. Comments flow

Comments are attached to saved fields.

Process:

1. `FieldCommentsPanel` loads comments with `GET /api/fields/{field_id}/comments`.
2. Users with comment permission can submit a new comment using `POST /api/fields/{field_id}/comments`.
3. The current UI sends an empty markers array.
4. After save, comments reload immediately.

Permission behavior:

- Viewers can read comments.
- Owners and editors can post comments.

### H. Workspace permission model in the frontend

The frontend uses `getFieldPermissions()` from `frontend/src/permissions/permissions.js`.

Important rules:

- `ADMIN`: full access everywhere
- `FARMER`: can create fields; field-level role controls edit/analyze/share/comment
- `AGRONOMIST`: cannot create new fields by default; can work on shared fields according to field role

Field-level role effects:

- `OWNER`: full field access
- `EDITOR`: can edit/analyze/comment
- `VIEWER`: read-only

## 2.5 My Farm Workflow

`frontend/src/pages/ProjectsOverviewPage.jsx`

Purpose:

- show all accessible fields
- open a field into the workspace
- open the latest report for a field

Page load:

1. Fetch fields.
2. Fetch analysis history.
3. Build per-field summaries.
4. Sort by latest analysis date.

Actions:

- `Open Field`: loads the field into the shared workspace state
- `View Report`: opens the latest available report context
- `Add Field`: routes to workspace to create a new field

## 2.6 Analysis Report Workflow

`frontend/src/pages/FieldReportPage.jsx`

Purpose:

- show the active report for the selected field
- display the field map in read-only mode
- show recommendations and vegetation indicators
- show analysis history for that same field

Page behavior:

1. Loads full analysis history again on mount.
2. Filters history down to the selected field.
3. Chooses an active report from:
   - the just-finished in-memory analysis result, or
   - the latest stored analysis for that field
4. Displays:
   - field summary
   - area
   - date
   - risk
   - NDVI / EVI
   - confidence
   - recommendations
5. Lets the user open older analyses from the timeline.
6. Lets the user run a new analysis from the report page.

## 2.7 Dashboard Workflow

`frontend/src/pages/DashboardPage.jsx`

The dashboard is role-aware.

It always loads:

- fields
- analysis history

For admins it also loads:

- admin stats
- audit logs

The page derives summary cards and analytics from fetched data, such as:

- total accessible area
- number of owned/shared/editable fields
- latest analysis status
- risk distribution
- average NDVI
- top crops
- large fields
- recent history
- recent audit events

Behavior changes by role:

- `FARMER`: focused on own farm summary and stressed fields
- `AGRONOMIST`: focused on shared client fields and attention areas
- `ADMIN`: focused on platform operations and system monitoring

## 2.8 Field Sharing Workflow

`frontend/src/pages/FieldAccessPage.jsx`

Purpose:

- list accessible fields
- view team members for a selected field
- grant or revoke access

Process:

1. Load all accessible fields.
2. Auto-select the first field if available.
3. Load that field's team using `GET /api/geo/fields/{field_id}/team`.
4. If current user is `OWNER` or `ADMIN`, they can:
   - share by email via `POST /api/geo/fields/share`
   - revoke via `DELETE /api/geo/fields/{field_id}/team/{user_id}`

Important frontend rule:

- Agronomists can inspect the team list for fields they have, but only owners can change access unless the user is admin.

## 2.9 Profile Workflow

`frontend/src/pages/ProfilePage.jsx`

Process:

1. Show current user details from app state.
2. Enter edit mode.
3. Submit `PATCH /api/users/me`.
4. Update the global stored user on success.

## 2.10 Admin Workflow

`frontend/src/pages/AdminPanelPage.jsx`

Admin-only operations:

1. Load users, stats, and audit logs.
2. Create users.
3. Change user role.
4. Block or unblock user.
5. Delete user.
6. Review audit log records.

The frontend treats admin data as operational data rather than normal farm data.

## 3. Backend Workflow

## 3.1 Backend Startup Flow

Entry point:

- `backend/main.py`

Startup behavior:

1. Load settings from `backend/core/config.py`.
2. Create database tables with `Base.metadata.create_all(bind=engine)`.
3. Create the FastAPI app.
4. Register global exception handling.
5. Configure permissive CORS.
6. Include all routers under `/api`.
7. On startup, launch `redis_listener()` in the background.

Main routers:

- `/api/health`
- `/api/auth`
- `/api/users`
- `/api/geo`
- `/api/analysis`
- `/api/admin`
- `/api/fields` for comments
- `/api/satellite`

## 3.2 Authentication and Authorization Workflow

### Authentication

Files:

- `backend/routers/auth.py`
- `backend/routers/deps.py`
- `backend/core/security.py`

Flow:

1. Register creates a user record unless email already exists.
2. Admin self-registration is blocked.
3. Login validates password and activity status.
4. A JWT token is issued with the user id in the subject.

Protected routes depend on:

- `get_current_user()`
- `get_current_active_user()`

### Authorization

There are two levels of authorization:

1. Platform role authorization with `RoleChecker`
2. Field-level authorization with `FieldPermissionChecker`

Field access hierarchy:

- `VIEWER`
- `EDITOR`
- `OWNER`

Admins bypass normal field checks.

## 3.3 Data Model Workflow

Main tables in `backend/infrastructure/database/models.py`:

- `users`
- `fields`
- `field_access`
- `satellite_images`
- `analyses`
- `analysis_artifacts`
- `spectral_indices`
- `ml_predictions`
- `field_comments`
- `audit_logs`

Key relationship logic:

- A field belongs to one owner.
- Field access is managed separately through `field_access`.
- Each analysis belongs to one field.
- Each analysis can produce one spectral indices record and one ML prediction record.
- Comments belong to a field and an author.

## 3.4 Field Creation Workflow

Files:

- `backend/routers/geo.py`
- `backend/services/field_service.py`
- `backend/services/geo_service.py`
- `backend/infrastructure/database/repositories.py`

Flow for `POST /api/geo/fields`:

1. Route receives field name and geometry.
2. `FieldService.create_field()` wraps that geometry into a `FeatureCollection`.
3. `process_geojson_upload()` loads it into GeoPandas.
4. The backend computes:
   - area in square meters
   - area in hectares
   - bounding box
   - geometry metadata
5. `FieldRepository.create()` converts GeoJSON geometry into PostGIS geometry.
6. A `fields` record is inserted.
7. A matching `field_access` record is created with `OWNER` for the creator.
8. An audit log entry is written.
9. The API returns field id, name, area, geometry, and role.

Important result:

- Area is computed on the backend, not trusted from the frontend.

## 3.5 Field Retrieval Workflow

For `GET /api/geo/fields`:

- Admins receive all fields plus owner information.
- Normal users receive only fields where they have active field access.

The response includes:

- field id
- name
- area
- geometry
- access role
- owner metadata
- created timestamp

## 3.6 Field Sharing Workflow

For `POST /api/geo/fields/share`:

1. Backend loads the target field.
2. It verifies the caller is owner or admin.
3. It finds the target user by email.
4. It creates or updates a `field_access` record.
5. It writes an audit log event.

For team listing:

- `GET /api/geo/fields/{field_id}/team` requires owner-level access.

For revoke:

- `DELETE /api/geo/fields/{field_id}/team/{user_id}` requires owner-level access.
- Owner access cannot be revoked through this route.

## 3.7 Comment Workflow

Files:

- `backend/routers/comments.py`

Add comment flow:

1. Route requires editor-level access.
2. A `field_comments` record is inserted.
3. Optional markers are saved as JSON.
4. An audit log entry is written.
5. Serialized comment data is returned.

Read comments flow:

1. Route requires viewer-level access.
2. Comments are returned newest first.

## 3.8 Satellite Metadata Workflow

Files:

- `backend/routers/satellite.py`
- `backend/services/satellite_service.py`

Current behavior:

- This route is a lightweight simulated metadata endpoint.
- It validates dataset choice loosely.
- It returns:
  - dataset
  - acquisition date
  - nominal resolution
  - bbox
  - `tile_ready` status

Important note:

- This is not the real imagery ingestion path used by the Celery analysis job.

## 3.9 Analysis Request Workflow

Files:

- `backend/routers/analysis.py`
- `backend/services/analysis_service.py`
- `backend/infrastructure/celery/celery_dispatcher.py`

For `POST /api/analysis/analyze`:

1. Route requires authenticated user.
2. Route checks field permission at editor level.
3. It creates `AnalysisService`.
4. `AnalysisService.run_analysis()` loads the field and re-checks practical access for owner/editor/admin.
5. It creates a new `analyses` row to track the job.
6. It dispatches Celery task `run_analysis_task`.
7. It stores the returned Celery task id in the analysis row.
8. It writes an audit log event `ANALYSIS_STARTED`.
9. It returns `analysis_id` immediately to the frontend.

This route does not perform analysis inline. It only queues the job.

## 3.10 Analysis Worker Workflow

Files:

- `backend/infrastructure/celery/tasks.py`
- `backend/use_cases/analyze_field.py`
- `backend/infrastructure/satellite/gee_client.py`
- `backend/infrastructure/geospatial/raster_processor.py`
- `backend/infrastructure/ml/resnet_adapter.py`
- `backend/infrastructure/storage/storage_provider.py`

### Worker entry

Celery runs `run_analysis_task`.

The task:

1. Opens a DB session.
2. Creates storage adapter.
3. Creates `AnalyzeFieldUseCase`.
4. Calls `execute(job_id, field_id, params, output_prefix)`.

### Use case phase 1: ingestion

The use case first verifies whether raw input already exists in object storage.

If raw input does not exist:

1. Job status is updated to `INGESTING`.
2. Field geometry is converted from PostGIS to GeoJSON.
3. `GEEClient` requests a Sentinel-2 median composite download URL for the field and date range.
4. The GeoTIFF is downloaded to a temporary file.
5. The temporary file is uploaded into object storage as `raw/{job_id}.tif`.
6. The analysis record stores `input_key`.

### Use case phase 2: processing

If processed result does not already exist:

1. Job status is updated to `PROCESSING`.
2. The raw TIFF is downloaded from storage.
3. `RasterProcessor.calculate_spectral_indices()` computes:
   - NDVI mean
   - EVI mean
   - NDVI min/max
   - stress zone count
   - stress area percentage
4. `ResNetAdapter.predict()` runs ML classification on the TIFF.
5. `AgronomicService.generate_assessment()` creates plain-language agronomic guidance.
6. The ML result is enriched with:
   - vegetation health score
   - risk level
   - assessment
7. Result metadata is uploaded to storage as JSON.
8. `AnalysisRepository.save_results()` writes:
   - one `spectral_indices` row
   - one `ml_predictions` row
9. The analysis record is marked `DONE`.

If anything fails:

1. Status is marked `FAILED`.
2. Error details are written to the analysis record.
3. Celery retry behavior may retry the task automatically.

### ML behavior summary

The current ML adapter:

- loads ResNet-50 weights from disk
- converts TIFF bands into RGB-like input
- runs either:
  - single prediction for small images, or
  - patch-based tiled prediction for larger images
- returns crop type and confidence

## 3.11 Analysis Status and Real-Time Update Workflow

Files:

- `backend/infrastructure/database/repositories.py`
- `backend/core/websocket_manager.py`
- `backend/routers/analysis.py`

### Progress update path

Every time progress changes, `AnalysisRepository.update_progress()`:

1. updates DB fields like progress and stage
2. appends an event entry into `event_log`
3. caches a JSON status payload in Redis under `analysis_status:{analysis_id}`
4. publishes that payload to Redis channel `analysis_updates`

### Polling path

For `GET /api/analysis/status/{analysis_id}`:

1. Backend checks Redis cache first.
2. If cache exists, it returns cached status immediately.
3. Otherwise it loads the analysis row from DB.
4. It checks viewer access to the field.
5. It returns status, progress, stage, results if complete, and error if any.

### WebSocket path

For `/api/analysis/ws/{user_id}?token=...`:

1. Backend decodes and validates JWT manually.
2. It verifies that token subject matches the socket path user id.
3. Socket connection is registered in `ConnectionManager`.
4. Background `redis_listener()` listens to Redis pubsub.
5. When an analysis update arrives, backend resolves recipient ids by:
   - all active field collaborators on that field
   - all active admins
6. The update is broadcast to all connected matching users.

This is why the frontend can receive live progress even if multiple collaborators have access to the same field.

## 3.12 Analysis History Workflow

For `GET /api/analysis/history`:

1. Backend loads all relevant analyses joined with:
   - fields
   - spectral indices
   - ML predictions
2. Admins can see all analyses.
3. Normal users only see analyses for fields where they have active access.
4. The route serializes data into frontend-ready report fields.

Returned data includes:

- analysis id
- field id and name
- area
- analysis date
- job status
- crop type
- confidence
- vegetation health
- risk level
- NDVI
- EVI
- stress metrics
- agronomic assessment

## 3.13 User Profile Workflow

For `GET /api/users/me`:

- backend returns the authenticated active user

For `PATCH /api/users/me`:

1. backend checks email uniqueness if changed
2. updates user fields
3. returns the updated profile

## 3.14 Admin Workflow

Files:

- `backend/routers/admin.py`

Admin-only operations:

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{user_id}`
- `POST /api/admin/users`
- `DELETE /api/admin/users/{user_id}`
- `GET /api/admin/audit`

### Admin stats workflow

The stats endpoint returns:

- total users
- total fields
- total analyses
- blocked users
- role breakdown
- weekly trend series
- operational resource summaries for:
  - Celery / Redis
  - object storage

### Admin user management workflow

Admins can:

- create users directly
- change role
- block or unblock users
- delete users

Safety rules:

- admin cannot block own account
- admin cannot remove own admin role
- admin cannot delete own account

Every admin mutation writes an audit log event.

## 3.15 Audit Logging Workflow

Files:

- `backend/services/audit_service.py`

Audit logs are created for important business and security events, including:

- field creation
- field sharing
- field access update
- field access revoke
- analysis start
- comment creation
- admin user create/update/delete

This data is later exposed to the admin panel.

## 4. End-to-End Request Journey

## 4.1 Save a field

1. User uploads or draws geometry in frontend.
2. Frontend stores geometry locally.
3. User saves field.
4. Frontend calls `POST /api/geo/fields`.
5. Backend calculates area and stores geometry in PostGIS.
6. Backend grants owner access and logs the event.
7. Frontend updates current field state with returned id and role.

## 4.2 Run an analysis

1. User opens a saved field in Workspace.
2. User clicks Run Analysis.
3. Frontend calls `POST /api/analysis/analyze`.
4. Backend creates analysis row and queues Celery job.
5. Worker downloads field imagery from GEE.
6. Worker stores raw image in object storage.
7. Worker computes vegetation indices.
8. Worker runs ResNet prediction.
9. Worker writes results into DB and storage.
10. Worker updates Redis progress repeatedly.
11. Frontend receives progress through WebSocket or polling.
12. Frontend reloads analysis history and builds report state.
13. User opens the Analysis Report page.

## 4.3 Share a field

1. Owner opens Field Sharing page.
2. Frontend loads accessible fields and current team.
3. Owner submits email and role.
4. Backend creates or updates `field_access`.
5. Audit log is written.
6. Team list refreshes.

## 5. Important Current Implementation Notes

These are useful to know because they affect the real workflow:

- The frontend analysis date range is currently hardcoded to `2023-05-01` through `2023-08-30`.
- The backend analysis route also falls back to that same date range if none is provided.
- Satellite metadata fetch is currently a mock endpoint and is separate from the true analysis ingestion pipeline.
- The frontend supports comments with marker payloads, but the current UI submits comments with an empty marker list.
- Analysis progress uses both WebSocket updates and status polling for resilience.
- The app uses local React state in `App.jsx` as the shared source of truth for the currently active field and analysis session.
- Backend table creation is performed automatically at startup through SQLAlchemy metadata sync.

## 6. Quick Mental Model

If you need the shortest possible explanation:

- Frontend: React keeps one shared field/analysis state in `App.jsx`, lets the user upload or draw a field, saves it, optionally fetches mock satellite metadata, starts analysis, listens for progress, then renders reports, comments, sharing, and admin views around that state.
- Backend: FastAPI authenticates the user, checks field-level access, stores fields and sharing rules, queues analysis jobs in Celery, processes satellite imagery through GEE + raster analysis + ResNet classification, saves results in DB/storage, and pushes progress through Redis and WebSockets.
