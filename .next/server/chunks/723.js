"use strict";exports.id=723,exports.ids=[723],exports.modules={70381:(e,t,a)=>{a.d(t,{db:()=>_});var r=a(35900),s=a(6113),i=a.n(s),n=a(42023),o=a.n(n);class l{trackOperation(e,t,a){return this.measureAsync(e,t,a)}trackSync(e,t,a){let r=Date.now();try{let s=t();return this.recordMetric(e,Date.now()-r,a),s}catch(t){throw this.recordMetric(e,Date.now()-r,{...a,error:!0}),t}}async measureAsync(e,t,a){let r=Date.now();try{let s=await t(),i=Date.now()-r;return this.recordMetric(e,i,a),i>200&&console.warn(`Slow operation: ${e} took ${i}ms`,a),s}catch(s){let t=Date.now()-r;throw this.recordMetric(e,t,{...a,error:!0}),console.error(`Failed operation: ${e} took ${t}ms`,s),s}}recordMetric(e,t,a){let r={operation:e,duration:t,timestamp:Date.now(),metadata:a};this.metrics.push(r),this.metrics.length>this.maxMetrics&&(this.metrics=this.metrics.slice(-this.maxMetrics))}getStats(e){let t=this.metrics;if(e&&(t=this.metrics.filter(t=>t.operation===e)),0===t.length)return{totalOperations:0,averageDuration:0,maxDuration:0,minDuration:0,slowOperations:0,errorRate:0};let a=t.map(e=>e.duration),r=t.filter(e=>e.metadata?.error).length,s=t.filter(e=>e.duration>200).length;return{totalOperations:t.length,averageDuration:a.reduce((e,t)=>e+t,0)/a.length,maxDuration:Math.max(...a),minDuration:Math.min(...a),slowOperations:s,errorRate:r/t.length*100}}getRecentMetrics(e=50){return this.metrics.slice(-e)}setCache(e,t,a=this.defaultTtl){this.cache.set(e,{data:t,timestamp:Date.now(),ttl:a})}getCache(e){let t=this.cache.get(e);return t?Date.now()-t.timestamp>t.ttl?(this.cache.delete(e),null):t.data:null}async getCachedOrExecute(e,t,a=this.defaultTtl){let r=this.getCache(e);if(null!==r)return r;let s=await t();return this.setCache(e,s,a),s}cleanupCache(){let e=0,t=Date.now();for(let[a,r]of this.cache.entries())t-r.timestamp>r.ttl&&(this.cache.delete(a),e++);return e}getMemoryUsage(){return process.memoryUsage()}getCacheStats(){return{size:this.cache.size,hitRate:0,memoryUsage:this.getMemoryUsage()}}clear(){this.metrics=[],this.cache.clear()}constructor(){this.metrics=[],this.cache=new Map,this.maxMetrics=1e3,this.defaultTtl=3e5}}let u=new l;function c(e,t,a){return u.trackOperation(`db_${e}`,t,a)}setInterval(()=>{let e=u.cleanupCache();e>0&&console.log(`Cleaned up ${e} expired cache entries`)},3e5);let d=null;async function E(){let e=await T();try{await e.query(`
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
        trial_start_date TIMESTAMP,
        trial_end_date TIMESTAMP,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        marketing_consent BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        onboarding_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `),await e.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        revoked BOOLEAN DEFAULT false,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `),await e.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        requests INTEGER DEFAULT 0,
        window_start TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),await e.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
      CREATE INDEX IF NOT EXISTS idx_users_restaurant_name ON users(restaurant_name);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window ON rate_limits(key, window_start);
    `),console.log("PostgreSQL tables and indexes created successfully")}finally{e.release()}}async function T(){let e=function(){if(d)return d;let e=process.env.POSTGRES_URL||process.env.DATABASE_URL;if(!e)throw Error("PostgreSQL connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.");return(d=new r.Pool({connectionString:e,ssl:{rejectUnauthorized:!1},max:20,idleTimeoutMillis:3e4,connectionTimeoutMillis:2e3})).on("error",e=>{console.error("Unexpected error on idle client",e)}),console.log("PostgreSQL connection pool initialized"),d}();return await e.connect()}async function m(){let e=await T();try{let t="4778fbcc-1b76-4ff5-adf1-124192102a88",a=await e.query("SELECT id FROM users WHERE id = $1",[t]);if(0===a.rows.length){let a=await o().hash("Admin123!",12),r=new Date,s=new Date(Date.now()+2592e6);await e.query(`
        INSERT INTO users (
          id, email, password_hash, name, restaurant_name, role,
          subscription_status, email_verified, onboarding_completed,
          marketing_consent, trial_start_date, trial_end_date,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,[t,"admin@chefsocial.com",a,"ChefSocial Admin","ChefSocial HQ","admin","active",!0,!0,!1,r,s,r,r]),console.log("Admin user created successfully")}}finally{e.release()}}let _={async initialize(){await E(),await m()},async createUser(e){let t=await T();try{let a=i().randomUUID(),r=new Date,s=await t.query(`
        INSERT INTO users (
          id, email, password_hash, name, restaurant_name, cuisine_type,
          location, phone, role, subscription_status, trial_start_date,
          trial_end_date, stripe_customer_id, stripe_subscription_id,
          marketing_consent, email_verified, onboarding_completed,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `,[a,e.email,e.passwordHash,e.name,e.restaurantName,e.cuisineType||"",e.location||"",e.phone||"",e.role||"user",e.subscriptionStatus||"trialing",e.trialStartDate?new Date(e.trialStartDate):null,e.trialEndDate?new Date(e.trialEndDate):null,e.stripeCustomerId,e.stripeSubscriptionId,e.marketingConsent||!1,e.emailVerified||!1,e.onboardingCompleted||!1,r,r]);return this.mapRowToUser(s.rows[0])}catch(e){if("23505"===e.code)throw Error("User with this email already exists");throw e}finally{t.release()}},async getUserByEmail(e){return c("getUserByEmail",async()=>{let t=await T();try{let a=await t.query("SELECT * FROM users WHERE email = $1 LIMIT 1",[e]);return a.rows.length>0?this.mapRowToUser(a.rows[0]):null}finally{t.release()}},{email:e})},async getUserById(e){let t=`user_${e}`;return u.getCache(t)||c("getUserById",async()=>{let a=await T();try{let r=await a.query("SELECT * FROM users WHERE id = $1 LIMIT 1",[e]),s=r.rows.length>0?this.mapRowToUser(r.rows[0]):null;return s&&u.setCache(t,s,3e5),s}finally{a.release()}},{id:e})},async updateUser(e,t){let a=await T();try{let r=[],s=[],i=1;if(Object.entries(t).forEach(([e,t])=>{if("id"!==e&&"createdAt"!==e){let a=this.camelToSnake(e);r.push(`${a} = $${i}`),s.push(e.includes("Date")&&t?new Date(t):t),i++}}),0===r.length)return this.getUserById(e);r.push(`updated_at = $${i}`),s.push(new Date),s.push(e);let n=`
        UPDATE users 
        SET ${r.join(", ")}
        WHERE id = $${i+1}
        RETURNING *
      `,o=await a.query(n,s);return o.rows.length>0?this.mapRowToUser(o.rows[0]):null}finally{a.release()}},async deleteUser(e){let t=await T();try{let a=await t.query("DELETE FROM users WHERE id = $1",[e]);return null!==a.rowCount&&a.rowCount>0}finally{t.release()}},async getAllUsers(e=1,t=10){let a=await T();try{let r=Date.now(),s=await a.query("SELECT COUNT(*) as count FROM users"),i=parseInt(s.rows[0].count),n=await a.query(`
        SELECT * FROM users 
        ORDER BY created_at DESC, id 
        LIMIT $1 OFFSET $2
      `,[t,(e-1)*t]),o=Date.now()-r;o>100&&console.warn(`Slow query detected: getAllUsers took ${o}ms for page ${e}, limit ${t}`);let l=n.rows.map(e=>this.mapRowToUser(e)),u=Math.ceil(i/t);return{users:l,total:i,totalPages:u}}finally{a.release()}},async createRefreshToken(e){let t=await T();try{await t.query(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,[e.id,e.userId,e.tokenHash,new Date(e.expiresAt),new Date(e.createdAt),e.revoked])}finally{t.release()}},async getRefreshToken(e){let t=await T();try{let a=await t.query(`
        SELECT * FROM refresh_tokens 
        WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()
        LIMIT 1
      `,[e]);if(0===a.rows.length)return null;let r=a.rows[0];return{id:r.id,userId:r.user_id,tokenHash:r.token_hash,expiresAt:r.expires_at.toISOString(),createdAt:r.created_at.toISOString(),revoked:r.revoked}}finally{t.release()}},async deleteRefreshToken(e){let t=await T();try{await t.query("UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1",[e])}finally{t.release()}},async deleteRefreshTokensByUserId(e){let t=await T();try{return(await t.query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",[e])).rowCount||0}finally{t.release()}},async getRateLimit(e){let t=await T();try{let a=await t.query("SELECT * FROM rate_limits WHERE key = $1",[e]);if(0===a.rows.length)return null;let r=a.rows[0];return{requests:r.requests,windowStart:new Date(r.window_start).getTime()}}finally{t.release()}},async setRateLimit(e,t){let a=await T();try{await a.query(`
        INSERT INTO rate_limits (key, requests, window_start, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (key) 
        DO UPDATE SET 
          requests = $2, 
          window_start = $3, 
          updated_at = NOW()
      `,[e,t.requests,new Date(t.windowStart)])}finally{a.release()}},async checkRateLimit(e,t,a){let r=Date.now(),s=r-r%a,i=await this.getRateLimit(e);return!i||i.windowStart<s?(await this.setRateLimit(e,{requests:1,windowStart:s}),{allowed:!0,remaining:t-1,resetTime:s+a}):i.requests>=t?{allowed:!1,remaining:0,resetTime:i.windowStart+a}:(await this.setRateLimit(e,{requests:i.requests+1,windowStart:i.windowStart}),{allowed:!0,remaining:t-i.requests-1,resetTime:i.windowStart+a})},mapRowToUser:e=>({id:e.id,email:e.email,passwordHash:e.password_hash,name:e.name,restaurantName:e.restaurant_name,cuisineType:e.cuisine_type,location:e.location,phone:e.phone,role:e.role,subscriptionStatus:e.subscription_status,trialStartDate:e.trial_start_date?.toISOString(),trialEndDate:e.trial_end_date?.toISOString(),stripeCustomerId:e.stripe_customer_id,stripeSubscriptionId:e.stripe_subscription_id,marketingConsent:e.marketing_consent,emailVerified:e.email_verified,onboardingCompleted:e.onboarding_completed,createdAt:e.created_at.toISOString(),updatedAt:e.updated_at.toISOString(),lastLoginAt:e.last_login_at?.toISOString()}),camelToSnake:e=>e.replace(/[A-Z]/g,e=>`_${e.toLowerCase()}`),async getAdminStats(){let e=await T();try{let t=`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) as active_trials,
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paid_subscriptions,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_this_month
        FROM users
        WHERE role != 'admin'
      `;return(await e.query(t)).rows[0]}finally{e.release()}},async healthCheck(){let e=await T();try{return await e.query("SELECT 1"),!0}catch(e){return console.error("Database health check failed:",e),!1}finally{e.release()}},async close(){d&&(await d.end(),d=null,console.log("PostgreSQL connection pool closed"))},async searchUsers(e="",t={},a=1,r=10){return c("searchUsers",async()=>{let s=await T();try{let i=(a-1)*r,n=[],o=[],l=1;e&&(n.push(`(
            name ILIKE $${l} OR 
            email ILIKE $${l} OR 
            restaurant_name ILIKE $${l}
          )`),o.push(`%${e}%`),l++),t.subscriptionStatus&&(n.push(`subscription_status = $${l}`),o.push(t.subscriptionStatus),l++),t.role&&(n.push(`role = $${l}`),o.push(t.role),l++),void 0!==t.emailVerified&&(n.push(`email_verified = $${l}`),o.push(t.emailVerified),l++);let u=n.length>0?`WHERE ${n.join(" AND ")}`:"",c=`SELECT COUNT(*) as count FROM users ${u}`,d=await s.query(c,o),E=parseInt(d.rows[0].count),T=`
          SELECT * FROM users 
          ${u}
          ORDER BY 
            CASE WHEN last_login_at IS NOT NULL THEN last_login_at END DESC NULLS LAST,
            created_at DESC,
            id
          LIMIT $${l} OFFSET $${l+1}
        `,m=(await s.query(T,[...o,r,i])).rows.map(e=>this.mapRowToUser(e)),_=Math.ceil(E/r);return{users:m,total:E,totalPages:_}}finally{s.release()}},{searchTerm:e,filters:t,page:a,limit:r})}};_.initialize().catch(console.error)},84235:(e,t,a)=>{a.d(t,{Gk:()=>T,H3:()=>N,Qp:()=>_,RZ:()=>S,S2:()=>h,b0:()=>p,dC:()=>w,vb:()=>m});var r=a(9133);let s=r.z.string().email("Invalid email format").min(1,"Email is required").max(255,"Email is too long"),i=r.z.string().min(8,"Password must be at least 8 characters").max(128,"Password is too long").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,"Password must contain at least one lowercase letter, one uppercase letter, and one number"),n=r.z.string().min(1,"Name is required").max(100,"Name is too long").regex(/^[a-zA-Z\s\-']+$/,"Name can only contain letters, spaces, hyphens, and apostrophes"),o=r.z.string().min(1,"Restaurant name is required").max(100,"Restaurant name is too long"),l=r.z.string().optional().refine(e=>!e||/^\+?[\d\s\-\(\)]+$/.test(e)&&e.replace(/\D/g,"").length>=7,"Invalid phone number format"),u=r.z.string().max(200,"Location is too long").optional(),c=r.z.string().max(50,"Cuisine type is too long").optional(),d=r.z.object({action:r.z.literal("login"),email:s,password:r.z.string().min(1,"Password is required")}),E=r.z.object({action:r.z.literal("register"),email:s,password:i,name:n,restaurantName:o,cuisineType:c,location:u,phone:l,marketingConsent:r.z.boolean().optional().default(!1)}),T=r.z.discriminatedUnion("action",[d,E]),m=r.z.object({refreshToken:r.z.string().min(1,"Refresh token is required")}),_=r.z.object({name:n.optional(),restaurantName:o.optional(),cuisineType:c,location:u,phone:l,marketingConsent:r.z.boolean().optional()}).refine(e=>Object.values(e).some(e=>void 0!==e),{message:"At least one field must be provided for update"}),h=r.z.string().min(1,"User ID is required").regex(/^user_\d+_[a-zA-Z0-9]+$/,"Invalid user ID format");r.z.enum(["user","admin","moderator"]),r.z.enum(["trialing","active","past_due","canceled","unpaid"]);let w=r.z.object({page:r.z.coerce.number().int().min(1).default(1),limit:r.z.coerce.number().int().min(1).max(100).default(10)});function p(e,t){try{let a=e.parse(t);return{success:!0,data:a}}catch(e){if(e instanceof r.z.ZodError){let t={};return e.errors.forEach(e=>{t[e.path.join(".")]=e.message}),{success:!1,errors:t}}return{success:!1,errors:{general:"Validation failed"}}}}function N(e){return e.toLowerCase().trim()}r.z.string().min(1).max(255),r.z.string().min(1,"ID is required");let S={REQUIRED_FIELD:"This field is required",INVALID_EMAIL:"Please enter a valid email address",WEAK_PASSWORD:"Password does not meet security requirements",INVALID_PHONE:"Please enter a valid phone number",MAX_LENGTH_EXCEEDED:"Input is too long",INVALID_FORMAT:"Invalid format",USER_EXISTS:"A user with this email already exists",USER_NOT_FOUND:"User not found",INVALID_CREDENTIALS:"Invalid email or password",UNAUTHORIZED:"You are not authorized to perform this action",RATE_LIMIT_EXCEEDED:"Too many requests. Please try again later.",INTERNAL_ERROR:"An internal error occurred. Please try again."}}};