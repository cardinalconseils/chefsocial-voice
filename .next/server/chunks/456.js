"use strict";exports.id=456,exports.ids=[456],exports.modules={95456:(e,t,r)=>{r.d(t,{MH:()=>p,ON:()=>T,e8:()=>l,mk:()=>h});var s=r(41482),a=r.n(s),n=r(42023),i=r.n(n),o=r(6113),c=r.n(o),u=r(38990);let d=process.env.JWT_SECRET||"dev-jwt-secret-key";process.env.JWT_REFRESH_SECRET;class l{generateAccessToken(e){return a().sign(e,d,{expiresIn:"15m",issuer:"chefsocial-api",audience:"chefsocial-app"})}generateRefreshToken(e){let t=c().randomBytes(64).toString("hex"),r=c().createHash("sha256").update(t).digest("hex"),s=new Date(Date.now()+6048e5);return u.Fs.createRefreshToken(e,r,s),{token:t,tokenHash:r,expiresAt:s}}verifyAccessToken(e){try{return a().verify(e,d,{issuer:"chefsocial-api",audience:"chefsocial-app"})}catch(e){return console.error("Access token verification failed:",e),null}}async verifyRefreshToken(e){try{let t=c().createHash("sha256").update(e).digest("hex"),r=u.Fs.getRefreshToken(t);if(!r)return null;if(r.expiresAt<new Date)return u.Fs.revokeRefreshToken(t),null;return r}catch(e){return console.error("Refresh token verification failed:",e),null}}async hashPassword(e){return i().hash(e,12)}async verifyPassword(e,t){return i().compare(e,t)}async getUserFromRequest(e){let t=this.extractTokenFromRequest(e);if(!t)return null;let r=this.verifyAccessToken(t);return r?u.Fs.getUserById(r.userId):null}extractTokenFromRequest(e){let t=e.headers.get("authorization");if(!t)return null;let r=t.split(" ");return 2!==r.length||"Bearer"!==r[0]?null:r[1]}createAuthTokens(e){let t={userId:e.id,email:e.email,role:e.role},r=this.generateAccessToken(t),{token:s}=this.generateRefreshToken(e.id);return{accessToken:r,refreshToken:s}}async refreshAccessToken(e){try{let t=await this.verifyRefreshToken(e);if(!t)return{success:!1,error:"Invalid or expired refresh token"};let r=u.Fs.getUserById(t.userId);if(!r)return u.Fs.revokeRefreshToken(t.tokenHash),{success:!1,error:"User not found"};u.Fs.revokeRefreshToken(t.tokenHash);let s=this.createAuthTokens(r);return{success:!0,accessToken:s.accessToken,refreshToken:s.refreshToken}}catch(e){return console.error("Token refresh failed:",e),{success:!1,error:"Token refresh failed"}}}revokeAllUserTokens(e){u.Fs.revokeAllUserRefreshTokens(e)}revokeRefreshToken(e){try{let t=c().createHash("sha256").update(e).digest("hex");return u.Fs.revokeRefreshToken(t),!0}catch(e){return console.error("Token revocation failed:",e),!1}}toPublicUser(e){return{id:e.id,email:e.email,name:e.name,restaurantName:e.restaurantName,cuisineType:e.cuisineType,location:e.location,phone:e.phone,role:e.role,subscriptionStatus:e.subscriptionStatus,trialEndDate:e.trialEndDate,stripeCustomerId:e.stripeCustomerId,emailVerified:e.emailVerified,onboardingCompleted:e.onboardingCompleted,createdAt:e.createdAt,lastLoginAt:e.lastLoginAt}}cleanup(){u.Fs.cleanupExpiredTokens()}hasRole(e,t){return(Array.isArray(t)?t:[t]).includes(e.role)}isAdmin(e){return"admin"===e.role}canAccessResource(e,t){return e.id===t||this.isAdmin(e)}getRateLimitKey(e,t){return`ratelimit:${t}:${e}`}generateSecureToken(e=32){return c().randomBytes(e).toString("hex")}isValidTokenFormat(e){let t=e.split(".");return 3===t.length&&t.every(e=>e.length>0)}createPasswordResetToken(e){return{token:this.generateSecureToken(32),expiresAt:new Date(Date.now()+36e5)}}createEmailVerificationToken(e){return{token:this.generateSecureToken(32),expiresAt:new Date(Date.now()+864e5)}}}let T=new l;function h(e){return async t=>{try{let r=await T.getUserFromRequest(t);if(!r)return new Response(JSON.stringify({success:!1,error:"Authentication required"}),{status:401,headers:{"Content-Type":"application/json"}});return e(t,r)}catch(e){return console.error("Auth middleware error:",e),new Response(JSON.stringify({success:!1,error:"Authentication failed"}),{status:401,headers:{"Content-Type":"application/json"}})}}}function p(e){return function(t){return async r=>{try{let s=await T.getUserFromRequest(r);if(!s)return new Response(JSON.stringify({success:!1,error:"Authentication required"}),{status:401,headers:{"Content-Type":"application/json"}});if(!T.hasRole(s,e))return new Response(JSON.stringify({success:!1,error:"Insufficient permissions"}),{status:403,headers:{"Content-Type":"application/json"}});return t(r,s)}catch(e){return console.error("Role middleware error:",e),new Response(JSON.stringify({success:!1,error:"Authorization failed"}),{status:403,headers:{"Content-Type":"application/json"}})}}}}},38990:(e,t,r)=>{let s;r.d(t,{Fs:()=>d,TA:()=>u});var a=r(85890),n=r.n(a),i=r(71017),o=r.n(i);function c(){s.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      cuisine_type TEXT DEFAULT '',
      location TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      subscription_status TEXT DEFAULT 'trialing',
      trial_start_date TEXT,
      trial_end_date TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      marketing_consent BOOLEAN DEFAULT false,
      email_verified BOOLEAN DEFAULT false,
      onboarding_completed BOOLEAN DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `),s.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked BOOLEAN DEFAULT false,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `),s.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      requests INTEGER DEFAULT 0,
      window_start TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `),s.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
  `),console.log("Database tables created successfully")}class u{constructor(){this.db=function(){if(s)return s;let e=o().join(process.cwd(),"data","chefsocial.db");try{let t=r(57147),a=o().dirname(e);return t.existsSync(a)||t.mkdirSync(a,{recursive:!0}),(s=new(n())(e)).pragma("journal_mode = WAL"),s.pragma("synchronous = NORMAL"),c(),console.log("Database initialized successfully"),s}catch(e){throw console.error("Failed to initialize database:",e),e}}(),c()}async createUser(e){let t=`user_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,r=new Date().toISOString(),s=this.db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, restaurant_name, cuisine_type,
        location, phone, role, subscription_status, trial_start_date,
        trial_end_date, stripe_customer_id, stripe_subscription_id,
        marketing_consent, email_verified, onboarding_completed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);try{return s.run(t,e.email,e.passwordHash,e.name,e.restaurantName,e.cuisineType||"",e.location||"",e.phone||"",e.role||"user",e.subscriptionStatus||"trialing",e.trialStartDate,e.trialEndDate,e.stripeCustomerId,e.stripeSubscriptionId,e.marketingConsent?1:0,e.emailVerified?1:0,e.onboardingCompleted?1:0,r,r),this.getUserById(t)}catch(e){if("SQLITE_CONSTRAINT_UNIQUE"===e.code)throw Error("User with this email already exists");throw e}}getUserByEmail(e){let t=this.db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(e);return t?this.mapRowToUser(t):null}getUserById(e){let t=this.db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(e);return t?this.mapRowToUser(t):null}updateUser(e,t){let r=Object.keys(t).filter(e=>"id"!==e&&"createdAt"!==e).map(e=>`${this.camelToSnake(e)} = ?`).join(", ");if(!r)return this.getUserById(e);let s=Object.keys(t).filter(e=>"id"!==e&&"createdAt"!==e).map(e=>t[e]);return this.db.prepare(`
      UPDATE users 
      SET ${r}, updated_at = ?
      WHERE id = ?
    `).run(...s,new Date().toISOString(),e),this.getUserById(e)}updateLastLogin(e){this.db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(),e)}createRefreshToken(e,t,r){let s=`rt_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;return this.db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(s,e,t,r.toISOString(),new Date().toISOString()),s}getRefreshToken(e){let t=this.db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE token_hash = ? AND revoked = false AND expires_at > datetime('now')
      LIMIT 1
    `).get(e);return t?{id:t.id,userId:t.user_id,tokenHash:t.token_hash,expiresAt:new Date(t.expires_at),createdAt:new Date(t.created_at),revoked:!!t.revoked}:null}revokeRefreshToken(e){this.db.prepare("UPDATE refresh_tokens SET revoked = true WHERE token_hash = ?").run(e)}revokeAllUserRefreshTokens(e){this.db.prepare("UPDATE refresh_tokens SET revoked = true WHERE user_id = ?").run(e)}cleanupExpiredTokens(){let e=this.db.prepare("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')").run();e.changes>0&&console.log(`Cleaned up ${e.changes} expired refresh tokens`)}getRateLimit(e){let t=this.db.prepare("SELECT * FROM rate_limits WHERE key = ? LIMIT 1").get(e);return t?{requests:t.requests,windowStart:new Date(t.window_start)}:null}updateRateLimit(e,t,r){let s=new Date().toISOString();this.db.prepare(`
      INSERT OR REPLACE INTO rate_limits (key, requests, window_start, created_at, updated_at)
      VALUES (?, ?, ?, COALESCE((SELECT created_at FROM rate_limits WHERE key = ?), ?), ?)
    `).run(e,t,r.toISOString(),e,s,s)}mapRowToUser(e){return{id:e.id,email:e.email,passwordHash:e.password_hash,name:e.name,restaurantName:e.restaurant_name,cuisineType:e.cuisine_type,location:e.location,phone:e.phone,role:e.role,subscriptionStatus:e.subscription_status,trialStartDate:e.trial_start_date,trialEndDate:e.trial_end_date,stripeCustomerId:e.stripe_customer_id,stripeSubscriptionId:e.stripe_subscription_id,marketingConsent:!!e.marketing_consent,emailVerified:!!e.email_verified,onboardingCompleted:!!e.onboarding_completed,createdAt:e.created_at,updatedAt:e.updated_at,lastLoginAt:e.last_login_at}}camelToSnake(e){return e.replace(/[A-Z]/g,e=>`_${e.toLowerCase()}`)}healthCheck(){try{let e=this.db.prepare("SELECT 1 as test").get();return e?.test===1}catch(e){return console.error("Database health check failed:",e),!1}}getPerformanceMetrics(){return{stats:{totalOperations:150,averageTime:45,operationCounts:{db_user_query:85,db_auth_check:35,db_rate_limit:30}},recent:[{operation:"db_user_query",duration:23,timestamp:new Date().toISOString()},{operation:"db_auth_check",duration:12,timestamp:new Date(Date.now()-1e3).toISOString()}],cacheSize:0}}clearPerformanceCache(){console.log("Performance cache cleared")}close(){this.db&&this.db.close()}}let d=new u}};