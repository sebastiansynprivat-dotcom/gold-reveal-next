
insert into storage.buckets (id, name, public)
values ('mass-dm-media', 'mass-dm-media', true)
on conflict (id) do nothing;

create policy "Public read mass-dm-media"
on storage.objects for select
using (bucket_id = 'mass-dm-media');

create policy "Admins upload mass-dm-media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mass-dm-media'
  and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sub_admin'))
);

create policy "Admins update mass-dm-media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'mass-dm-media'
  and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sub_admin'))
);

create policy "Admins delete mass-dm-media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'mass-dm-media'
  and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'sub_admin'))
);
