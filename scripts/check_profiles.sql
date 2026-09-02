SELECT p.id, p.full_name, p.display_name, p.phone, p.role, p.is_active, au.email, au.id as auth_id 
FROM profiles p 
LEFT JOIN auth.users au ON p.id = au.id;
