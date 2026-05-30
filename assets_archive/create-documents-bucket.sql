-- Create the "documents" storage bucket if it doesn't exist
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Enable RLS policies for the objects in the "documents" bucket
-- 1. Allow authenticated users to upload files
create policy "Allow authenticated users to insert objects"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'documents' );

-- 2. Allow authenticated users to read files
create policy "Allow authenticated users to read objects"
on storage.objects for select
to authenticated
using ( bucket_id = 'documents' );

-- 3. Allow authenticated users to update files
create policy "Allow authenticated users to update objects"
on storage.objects for update
to authenticated
using ( bucket_id = 'documents' );

-- 4. Allow authenticated users to delete files
create policy "Allow authenticated users to delete objects"
on storage.objects for delete
to authenticated
using ( bucket_id = 'documents' );
