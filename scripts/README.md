# Scripts Directory

This directory contains all project scripts organized by category.

## Directory Structure

### Core Scripts
Essential scripts for database management and environment control:
- `db-environment.sh` - Environment configuration management (production, backup, dev)
- `incremental-db-sync.sh` - Incremental database synchronization
- `db-backup-scheduler.sh` - Automated backup scheduling
- `dev-server.sh` - Development environment management (start/stop/restart)

### `development/`
Development and local environment scripts:
- `start.sh` / `start.bat` - Local development environment startup scripts
- `rebuild-frontend.sh` - Frontend rebuild script
- `start-image-tagging.sh` - Image tagging feature startup script

### `verification/`
Verification and testing scripts:
- `verify-filtering-fix.js` - Filtering functionality verification
- `verify-fix.js` - General fix verification
- `check-server-index.sh` - Server index check
- `create-test-user.js` - Test user creation utility
- `find-users.js` - User search utility

### `data/`
Data import and management scripts:
- `import_inspiration_data.js` - Inspiration data import script

### `archived/`
Archived scripts and reports (completed tasks):
- One-time fix scripts (tag editing, performance optimization, etc.)
- Optimization reports and documentation
- Legacy deployment scripts

### Root Level Scripts
Deployment and CI/CD scripts remain in the root directory for deployment compatibility:
- `deploy.sh` - Basic deployment script
- `connect-and-deploy.sh` - SSH deployment script
- `fix-git-lock.sh` - Git lock file fix

## Usage

### Environment Management
```bash
# Initialize environment configurations
./scripts/db-environment.sh init

# Switch to development environment
./scripts/db-environment.sh switch dev

# Verify environment configuration
./scripts/db-environment.sh verify dev

# Show environment status
./scripts/db-environment.sh status
```

### Database Synchronization
```bash
# Incremental sync (default)
./scripts/incremental-db-sync.sh incremental

# Full sync (first time)
./scripts/incremental-db-sync.sh full-sync

# Test development environment sync
./scripts/incremental-db-sync.sh test-dev

# Verify sync results
./scripts/incremental-db-sync.sh verify
```

### Development Environment
```bash
# Start development environment
./scripts/dev-server.sh start

# Stop development environment
./scripts/dev-server.sh stop

# Restart development environment
./scripts/dev-server.sh restart

# View logs
./scripts/dev-server.sh logs

# Enter backend container
./scripts/dev-server.sh shell
```

### Backup Management
```bash
# Schedule daily backups
./scripts/db-backup-scheduler.sh daily

# Manual backup
./scripts/backup-db.sh
```

## Environment Strategy

The project uses a three-environment strategy:

1. **Production** (`cardesignspace`) - Live production database
2. **Backup** (`cardesignspace_backup`) - Automated backup of production data
3. **Development** (`cardesignspace_dev`) - Development and testing environment

### Sync Flow
- Production → Backup (daily incremental sync)
- Backup → Development (on-demand sync + new features)
- Development → Production (schema changes only, after testing)

## Notes

- Scripts in the root directory are critical for deployment and should not be moved
- Environment configurations are managed through `db-environment.sh`
- All archived scripts are preserved for reference but are no longer actively used
- Always test deployment after any script reorganization
