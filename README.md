# CryoVizWeb Documentation

## Backend (API Routes)

- **Auth**
  - `GET/POST /api/auth/[...nextauth]`: NextAuth handler using JWT sessions and MongoDB adapter.
  - `POST /api/auth/request-otp`: Start OTP login flow.
  - `POST /api/auth/verify-otp`: Verify OTP and create session.
  - `GET /api/auth/check-user`: Check if a user exists/has access.
  - `POST /api/auth/request-access`: Request access workflow.

- **Admin**
  - `GET /api/admin`: Admin health/status.
  - `GET /api/admin/dashboard`: Fetch dashboard metrics and datasets/users activity.
  - `POST /api/admin/dashboard`: Mutations like `update-system-metrics`, `update-dataset-status`.

- **Datasets & Media**
  - `GET /api/media?dataset={id}`: List media files for a dataset.
  - `POST /api/media`: Add media metadata entry.
  - `DELETE /api/media?dataset={id}&filename={name}`: Delete blob + metadata.
  - `POST /api/upload-to-azure`: Create SAS URLs for client direct upload to temp container.
  - `GET /api/upload-status[?uploadId={id}]`: Get upload status(es) for current user.
  - `POST /api/upload-status`: Create/update upload status; internal allowed via `x-internal-secret`.
  - `POST /api/upload-dataset-async`: Trigger backend async processing pipeline.
  - `GET /api/dataset-spacing?datasetId={id}`: Fetch voxel spacing.

- **Mappings**
  - `GET /api/dataset-mappings`: List mappings.
  - `POST /api/dataset-mappings`: Create mapping.
  - `PUT /api/dataset-mappings`: Update mapping.
  - `DELETE /api/dataset-mappings`: Delete mapping.

- **Annotations & Views**
  - `GET/POST/PUT/DELETE /api/annotations`: CRUD user annotations.
  - `GET /api/views`: List saved views.
  - `POST /api/views/load`: Load saved views in bulk.
  - `POST /api/views/bulk`: Create/update multiple views.

- **Feedback & Notifications**
  - `POST /api/feedback`: Submit feedback.
  - `GET /api/feedback/admin`: List feedback (admin).
  - `POST /api/notifications`: Create notifications.

- **Studies**
  - `GET /api/studies?datasetId={id}`: List user studies for dataset.
  - `POST /api/studies`: Create a study.
  - `PUT /api/studies`: Update study name/description.
  - `DELETE /api/studies`: Delete a study (with constraints).

## Library Methods (`lib/`)

- `lib/auth.ts`
  - **authOptions**: NextAuth configuration (JWT sessions, MongoDB adapter, callbacks to enrich token/session, `redirect` returns '/').

- `lib/mongodb.ts`
  - Default export `clientPromise`: shared MongoDB client.

- `lib/models.ts`
  - Institutions: `getInstitutions`, `createInstitution`, `updateInstitution`, `deleteInstitution`.
  - Users: `getUsers`, `createUser`, `updateUser`, `updateUserLastLogin`, `updateUserDatasets`, `deleteUser`.
  - Datasets: `getDatasets`, `createDataset`, `updateDataset`, `deleteDataset`.
  - DatasetMappings: `getDatasetMappings`, `getDatasetMappingByParent`, `createDatasetMapping`, `updateDatasetMapping`, `deleteDatasetMapping`.

- `lib/notifications.ts`
  - `createNotification`, `createNotificationsForUsers`, `createUploadNotification`, `createDatasetAssignmentNotification`, `createAccessLevelNotification`.

- `lib/utils.ts`
  - `cn(...inputs)`: className merge helper.
  - `getInitials(name)`: initial from name.

## Frontend

- **Hooks (`hooks/`)**
  - `useDashboardData()`: fetches and manages admin dashboard data with helpers `updateSystemMetrics`, `updateDatasetStatus`.
  - `useIsMobile()`: media-query based mobile detection (768px breakpoint).

- **Key Components (`components/`)**
  - Admin
    - `admin/Dashboard/section-cards.tsx`: shows high-level metrics via `useDashboardData`.
    - `admin/Users/*`: `Users`, `UserForm` for managing users.
    - `admin/Institutions/*`: `Institutions`, `InstitutionForm` for institutions.
    - `admin/Dataset/*`: dataset list, forms, upload status table, dialogs.
    - `admin/Mappings/*`: mapping UI and DnD `sortable-item`.
  - Viewer
    - `OrthographicViewer/*`: volume viewer, annotations (`useAnnotations`, panels, modals), measurements, controls.
    - `VolumeViewerPng/*`: PNG-based volume viewer with shaders, opacity/quality sliders, spacing control.
  - Navigation/Theme
    - `sidebar/*`: app nav, user menu, projects, secondary.
    - `theme-provider`, `theme-toggle`, `ui/*`: UI primitives.

## Environments & Configuration

- Required env variables (non-exhaustive):
  - `MONGODB_URI`, `NEXTAUTH_SECRET`
  - `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_TEMP_CONTAINER`
  - `INTERNAL_API_SECRET` (for internal upload status updates)

- Next.js config (`next.config.ts`):
  - `output: 'standalone'`, images remotePatterns, webpack alias `@` to project root.

- Azure Static Web Apps
  - Workflow: `.github/workflows/azure-static-web-apps-*.yml` uses `pnpm`, builds, and deploys with `app_artifact_location: .next`, `api_location: app/api`.
  - `staticwebapp.config.json` routes `_next/*`, `api/*`, and SPA fallback.

## Development

- Install: `pnpm install`
- Run: `pnpm dev`
- Lint: `pnpm lint`
- Build: `pnpm build`

## API Usage Examples

- List media for dataset:
  - `GET /api/media?dataset=DATASET_ID`
- Create SAS upload URLs:
  - `POST /api/upload-to-azure` with `{ fileName, uploadId }`
- Upload status (user):
  - `GET /api/upload-status` or `GET /api/upload-status?uploadId=...`
  - `POST /api/upload-status` with body `{ uploadId, status, progress, message, datasetName, result?, error? }`

For deeper details, open the corresponding files noted above.

