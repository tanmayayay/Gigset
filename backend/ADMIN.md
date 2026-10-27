# Admin console: how to get in

1. In Render → your API service → Environment, add:
   `ADMIN_EMAILS` = `you@gmail.com,partner@gmail.com` (the emails you each sign in to Gigset with, no spaces, no quotes).
2. In Supabase → SQL Editor, run `backend/admin-tools.sql` once (safe to run again).
3. Save, let Render redeploy, then sign in to Gigset. An **Admin** link appears in the left menu.

Later you can make another person an admin from the console: People → click them → "Make admin".
You never need to touch code. Everything an admin does is listed under "Activity log".
