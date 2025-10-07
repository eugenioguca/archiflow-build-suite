-- Storage policies for company operation manuals bucket
-- Bucket: operation-manuals (used by companyManualsAdapter)

-- Read policy: authenticated users can view/list manuals
create policy "Authenticated users can view operation manuals"
on storage.objects for select
to authenticated
using (bucket_id = 'operation-manuals');

-- Insert policy: only admin and employee roles can upload
create policy "Admin and employees can upload operation manuals"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'operation-manuals'
  and exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role in ('admin', 'employee')
  )
);

-- Update policy: only admin and employee roles can update
create policy "Admin and employees can update operation manuals"
on storage.objects for update
to authenticated
using (
  bucket_id = 'operation-manuals'
  and exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role in ('admin', 'employee')
  )
);

-- Delete policy: only admin and employee roles can delete
create policy "Admin and employees can delete operation manuals"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'operation-manuals'
  and exists (
    select 1 from public.profiles
    where user_id = auth.uid()
    and role in ('admin', 'employee')
  )
);