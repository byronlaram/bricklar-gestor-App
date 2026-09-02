SELECT 
  (SELECT count(*) FROM profiles) as total_profiles,
  (SELECT count(*) FROM tasks) as total_tasks,
  (SELECT count(*) FROM workdays) as total_workdays,
  (SELECT count(*) FROM bus_routes) as total_bus_routes,
  (SELECT count(*) FROM branches) as total_branches;
