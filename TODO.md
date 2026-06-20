# TODO: Fix Admin Drive Approval/Rejection Issues

## Information Gathered
- Drives table has `status` column ('pending', 'approved', 'rejected') added via migration.
- Backend admin.js updates `status` when approving/rejecting drives.
- Frontend AdminDashboard.jsx uses `drive.is_approved` for status display and button visibility, but `is_approved` is not updated (legacy field).
- Company portal (companies.js) shows all drives for the company, including rejected ones.
- Public drives API (drives.js) only shows approved and active drives.
- Rejected drives are kept in database, visible only to the company that created them.

## Plan
- Update AdminDashboard.jsx to use `drive.status` instead of `drive.is_approved` for status display and button logic.
- Change status badge logic: 'Approved' (green) if status === 'approved', 'Rejected' (red) if 'rejected', 'Pending' (yellow) otherwise.
- Show approve/reject buttons only when status === 'pending'.
- No changes to backend rejection logic - keep rejected drives in database for company visibility.

## Dependent Files to Edit
- frontend/src/pages/admin/AdminDashboard.jsx

## Followup Steps
- Test the admin dashboard: approve/reject drives and verify buttons update correctly.
- Verify rejected drives appear in company portal but not in public drives list.
