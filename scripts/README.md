# Scripts Directory

This directory contains all project scripts organized by category.

## Directory Structure

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

### Root Level Scripts
Deployment and CI/CD scripts remain in the root directory for deployment compatibility:
- `deploy.sh` - Basic deployment script
- `connect-and-deploy.sh` - SSH deployment script
- `apply-*-cicd.sh` - CI/CD configuration scripts
- `fix-*.sh` - Various fix scripts

## Usage

### Development Scripts
```bash
# Start local development environment
./scripts/development/start.sh

# Rebuild frontend
./scripts/development/rebuild-frontend.sh
```

### Verification Scripts
```bash
# Verify fixes
node scripts/verification/verify-fix.js

# Check server status
./scripts/verification/check-server-index.sh
```

### Data Scripts
```bash
# Import inspiration data
node scripts/data/import_inspiration_data.js
```

## Notes

- Scripts in the root directory are critical for deployment and should not be moved
- Development scripts can be safely moved to subdirectories
- Always test deployment after any script reorganization
