// FusionAuth Connector API for Progressive Migration
router.post('/fusionauth/connector', async (req, res) => {
    const APPLICATION_ID = 'e9fdb985-9173-4e01-9d73-ac2d60d1dc8e';
    
    try {
      console.log(`FusionAuth connector request received for ${req.body.loginId}`);
      
      const { loginId, password } = req.body;
      
      // Validate required parameters
      if (!loginId || !password) {
        console.warn('Missing loginId or password in FusionAuth connector request');
        return res.status(400).json({ error: 'Missing loginId or password' });
      }
      
      // Find user by email
      const user = await User.findByEmail(loginId.toLowerCase());
      
      if (user && await authenticateConnectorUser(user, password)) {
        console.log(`User authentication successful for ${loginId}. Returning user data to FusionAuth`);
        
        const userData = await buildFusionAuthUser(user, password);
        console.log('Returning user data:', JSON.stringify(userData, null, 2));
        
        res.json({ user: userData });
      } else {
        console.warn(`Authentication failed for ${loginId}`);
        res.status(404).json({ error: 'User not found or authentication failed' });
      }
    } catch (error) {
      console.error('Error in FusionAuth connector:', error.message);
      console.error(error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Helper functions for FusionAuth connector
  async function authenticateConnectorUser(user, password) {
    // Only authenticate local users with email/password
    if (user.provider === 'local' && user.password) {
      return bcrypt.compareSync(password, user.password);
    }
    
    return false;
  }
  
  async function buildFusionAuthUser(user, password) {
    const crypto = require('crypto');
    
    // Generate consistent UUID based on user ID
    const userUuid = generateConsistentUuid(user.id);
    
    return {
      // Required fields for FusionAuth
      id: userUuid,
      email: user.email,
      username: user.email,
      
      // Authentication fields - pass through the plaintext password for FusionAuth to hash
      password: password, // Pass through the plaintext password for FusionAuth to hash
      passwordChangeRequired: false,
      
      // User profile fields
      fullName: user.name,
      firstName: extractFirstName(user.name),
      lastName: extractLastName(user.name),
      imageUrl: user.avatar,
      verified: user.verified,
      active: user.active,
      
      // Timestamps
      insertInstant: user.createdAt ? new Date(user.createdAt).getTime() : Date.now(),
      lastUpdateInstant: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
      lastLoginInstant: user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : null,
      
      // Application registration - associate user with the application
      registrations: [{
        id: crypto.randomUUID(),
        applicationId: APPLICATION_ID,
        verified: user.verified,
        roles: ['user']
      }],
      
      // Migration metadata stored in user data
      data: {
        migrated_from: 'local_authentication',
        original_id: user.id,
        migrated_at: new Date().toISOString(),
        provider: user.provider,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        migration_note: 'User migrated from email/password authentication'
      }
    };
  }
  
  
  
  function generateConsistentUuid(userId) {
    // Generate a consistent UUID based on user ID
    const crypto = require('crypto');
    const namespaceUuid = '550e8400-e29b-41d4-a716-446655440002'; // Different namespace for connector
    const data = `connector_user_${userId}`;
    
    // Create a deterministic UUID using SHA-1 hash (UUID v5)
    const hash = crypto.createHash('sha1').update(namespaceUuid + data).digest();
    
    // Format as UUID v5
    const hashHex = hash.toString('hex');
    const uuid = `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-5${hashHex.substring(13, 16)}-${(parseInt(hashHex.substring(16, 17), 16) & 0x3 | 0x8).toString(16)}${hashHex.substring(17, 20)}-${hashHex.substring(20, 32)}`;
    
    return uuid;
  }
  
  function extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }
  
  function extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length < 2 ? '' : parts.slice(1).join(' ');
  }
  