# Deployment Troubleshooting

## Issue: Connection Timeout

If you're getting "Connection timed out" errors, try these solutions:

### Solution 1: Run from Your Local Terminal

The automated script works best when run from your own machine. Open a terminal and run:

```bash
cd /Users/aaron/SchoolTransportSystem/backend
./deploy-to-contabo.sh
```

### Solution 2: Check Server Firewall

Your Contabo server might be blocking SSH connections. Log into your Contabo control panel and:

1. Check if the server is running
2. Verify firewall settings allow SSH (port 22)
3. Check if there are any IP restrictions

### Solution 3: Verify SSH Access Manually

Test SSH connection from your local terminal:

```bash
ssh root@38.242.243.175
# Password: TRYMENOT
```

If this works, the automated script should also work from your terminal.

### Solution 4: Check SSH Port

If SSH is on a non-standard port, update the script:

```bash
# Edit deploy-to-contabo.sh and change the SSH port
# Look for: sshpass -p "$SERVER_PASSWORD" ssh ...
# Add: -p YOUR_PORT_NUMBER
```

### Solution 5: Use Manual Deployment

If automated deployment continues to fail, use the manual steps in `MANUAL_DEPLOY_STEPS.md`.

## Common Issues

### Issue: "sshpass: command not found"

**Solution:**
```bash
# macOS
brew install hudochenkov/sshpass/sshpass

# Linux
sudo apt-get install sshpass
```

### Issue: "Permission denied (publickey)"

**Solution:** The script uses password authentication. Make sure:
- Password is correct: `TRYMENOT`
- Server allows password authentication (not just SSH keys)

### Issue: "Connection refused"

**Solution:**
- Server might be down - check Contabo control panel
- SSH service might not be running on the server
- Firewall might be blocking port 22

### Issue: Script runs but containers fail to start

**Solution:** Check logs on the server:
```bash
ssh root@38.242.243.175
cd /opt/school-transport-backend/backend
docker-compose -f docker-compose.prod.yml logs
```

## Recommended Approach

1. **First, test manual SSH:**
   ```bash
   ssh root@38.242.243.175
   ```

2. **If SSH works, run the automated script from your terminal:**
   ```bash
   cd /Users/aaron/SchoolTransportSystem/backend
   ./deploy-to-contabo.sh
   ```

3. **If SSH doesn't work, check:**
   - Contabo control panel for server status
   - Firewall settings
   - IP whitelist restrictions

4. **If all else fails, use manual deployment:**
   Follow `MANUAL_DEPLOY_STEPS.md`

