tenant_prefix = 0
application_prefix = 1

def print_uuid(prefix, value)
  uuid_str = "%016x%016x" % [prefix, value]
  uuid_str.insert(20, '-')
  uuid_str.insert(16, '-')
  uuid_str.insert(12, '-')
  uuid_str.insert(8, '-')
  return uuid_str
end
