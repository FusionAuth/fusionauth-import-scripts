# FusionAuth Import Script For Ruby On Rails

A script to import user data from Rails-based authentication systems into FusionAuth. Features duplicate handling, verbose logging, and social account linking for OmniAuth integrations.

## Prerequisites

1. **FusionAuth Instance:** Running FusionAuth server (default: <http://localhost:9011>)
2. **API Key:** FusionAuth API key with user import permissions
3. **Ruby:** Ruby 2.7 or higher with bundler
4. **Export File:** JSON export file from your Rails-based authentication system. Refer to the [FusionAuth Users documentation](https://fusionauth.io/docs/apis/users#import-users) for details.

## Installation

1. Install dependencies.

   ```bash
   bundle install
   ```

2. Make the script executable.

   ```bash
   chmod +x import.rb
   ```

3. (Optional) Make the wrapper script executable.

   ```bash
   chmod +x import.sh
   ```

## Usage

```bash
./import.rb -k YOUR_API_KEY -u users_export_file.json
```

This imports users from the file into FusionAuth's default tenant and application.

### Advanced Usage

```bash
./import.rb \
  --fusionauth-api-key YOUR_API_KEY \
  --users-file users_export_file.json \
  --fusionauth-url http://localhost:9011 \
  --fusionauth-tenant-id YOUR_TENANT_ID \
  --source-system devise \
  --register-users app-id-1,app-id-2,app-id-3 \
  --link-social-accounts \
  --verbose
```

## Command Line Options

| Option | Short | Required | Default | Description |
|--------|-------|----------|---------|-------------|
| `--users-file` | `-u` | No | `users.json` | Path to the exported JSON user file |
| `--fusionauth-api-key` | `-k` | **Yes** | - | FusionAuth API key |
| `--fusionauth-url` | `-f` | No | `http://localhost:9011` | FusionAuth instance URL |
| `--fusionauth-tenant-id` | `-t` | No | - | Tenant Id (required if multiple tenants exist) |
| `--source-system` | `-s` | No | Auto-detected | Source system: `devise`, `rails_auth`, or `omniauth` |
| `--register-users` | `-r` | No | - | Comma-separated list of application Ids |
| `--link-social-accounts` | `-l` | No | `false` | Link social accounts for OmniAuth users |
| `--verbose` | `-v` | No | `false` | Enable detailed logging |
| `--help` | `-h` | No | - | Show help message |

## Supported Authentication Systems

**Devise:** Imports users, encrypted passwords, and user metadata. Preserves email confirmation status and account locking.

**OmniAuth:** Imports social accounts with identity provider linking. Specify social provider and provider user Id in the `user[x].data` field.

**Rails In-Built Authentication:** Imports users, confirmation status, and sign-in tracking data.
