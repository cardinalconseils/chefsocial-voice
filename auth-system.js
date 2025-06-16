// ChefSocial Authentication and Stripe Integration
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Stripe = require('stripe');
const ChefSocialDatabase = require('./database');

class ChefSocialAuth {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        this.db = new ChefSocialDatabase();
        this.jwtSecret = process.env.JWT_SECRET || 'chefsocial-super-secret-key-change-in-production';
        
        // Stripe price IDs - replace with your actual Stripe price IDs
        this.pricingPlans = {
            starter: {
                priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
                name: 'Starter',
                price: 2900, // $29/month
                features: ['voice_content_creation', 'multi_platform_optimization']
            },
            professional: {
                priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_test',
                name: 'Professional', 
                price: 7900, // $79/month
                features: [
                    'voice_content_creation', 
                    'natural_conversation',
                    'unlimited_content',
                    'multi_platform_optimization',
                    'brand_voice_learning',
                    'analytics_insights'
                ]
            },
            enterprise: {
                priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_test',
                name: 'Enterprise',
                price: 19900, // $199/month
                features: [
                    'voice_content_creation',
                    'natural_conversation', 
                    'unlimited_content',
                    'multi_platform_optimization',
                    'brand_voice_learning',
                    'analytics_insights',
                    'bulk_content_creation',
                    'priority_support',
                    'custom_integrations'
                ]
            }
        };
    }

    // Registration with Stripe
    async registerUser(userData) {
        try {
            const { email, password, name, restaurantName, planName, paymentMethodId } = userData;

            // Check if user already exists
            const existingUser = await this.db.getUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Get plan details
            const plan = this.pricingPlans[planName];
            if (!plan) {
                throw new Error('Invalid plan selected');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Create Stripe customer
            const customer = await this.stripe.customers.create({
                email: email,
                name: name,
                metadata: {
                    restaurant_name: restaurantName || '',
                    plan: planName
                }
            });

            // Attach payment method to customer
            await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customer.id,
            });

            // Set as default payment method
            await this.stripe.customers.update(customer.id, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            // Create subscription
            const subscription = await this.stripe.subscriptions.create({
                customer: customer.id,
                items: [{ price: plan.priceId }],
                trial_period_days: 14,
                expand: ['latest_invoice.payment_intent'],
            });

            // Create user in database
            const userId = uuidv4();
            await this.db.createUser({
                id: userId,
                email: email,
                passwordHash: passwordHash,
                name: name,
                restaurantName: restaurantName
            });

            // Update user with Stripe customer ID
            await this.db.db.run(`
                UPDATE users SET stripe_customer_id = ? WHERE id = ?
            `, [customer.id, userId]);

            // Create subscription record
            const subscriptionId = uuidv4();
            await this.db.createSubscription({
                id: subscriptionId,
                userId: userId,
                stripeSubscriptionId: subscription.id,
                stripePriceId: plan.priceId,
                planName: planName,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            });

            // Generate JWT token
            const token = this.generateJWT(userId);

            console.log(`✅ User registered successfully: ${email} (${planName} plan)`);

            return {
                success: true,
                token: token,
                user: {
                    id: userId,
                    email: email,
                    name: name,
                    restaurantName: restaurantName,
                    plan: planName
                },
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
                }
            };

        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    // Login
    async loginUser(email, password) {
        try {
            const user = await this.db.getUserByEmail(email);
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            await this.db.db.run(`
                UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
            `, [user.id]);

            // Generate JWT token
            const token = this.generateJWT(user.id);

            console.log(`✅ User logged in: ${email}`);

            return {
                success: true,
                token: token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    restaurantName: user.restaurant_name,
                    plan: user.plan_name || 'trial'
                }
            };

        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    // JWT token generation
    generateJWT(userId) {
        return jwt.sign(
            { userId: userId },
            this.jwtSecret,
            { expiresIn: '7d' }
        );
    }

    // JWT token verification
    verifyJWT(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return decoded.userId;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Middleware for protected routes
    authMiddleware() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ error: 'Access token required' });
                }

                const token = authHeader.substring(7);
                const userId = this.verifyJWT(token);
                
                const user = await this.db.getUserById(userId);
                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }

                req.user = user;
                req.userId = userId;
                next();

            } catch (error) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
        };
    }

    // Feature access middleware
    featureAccessMiddleware(featureKey) {
        return async (req, res, next) => {
            try {
                if (!req.userId) {
                    return res.status(401).json({ error: 'Authentication required' });
                }

                const hasAccess = await this.db.checkFeatureAccess(req.userId, featureKey);
                if (!hasAccess) {
                    return res.status(403).json({ 
                        error: 'Feature not available in your plan',
                        feature: featureKey,
                        upgradeRequired: true
                    });
                }

                // Track usage
                await this.db.trackUsage(req.userId, featureKey);
                next();

            } catch (error) {
                console.error('❌ Feature access check error:', error);
                return res.status(500).json({ error: 'Access check failed' });
            }
        };
    }

    // Get user's feature access
    async getUserFeatures(userId) {
        return await this.db.getUserFeatures(userId);
    }

    // Stripe webhook handling
    async handleStripeWebhook(event) {
        try {
            console.log(`🔔 Stripe webhook: ${event.type}`);

            switch (event.type) {
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

        } catch (error) {
            console.error('❌ Webhook handling error:', error);
            throw error;
        }
    }

    async handleSubscriptionUpdated(subscription) {
        await this.db.updateSubscription(subscription.id, {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
    }

    async handleSubscriptionDeleted(subscription) {
        await this.db.updateSubscription(subscription.id, {
            status: 'canceled',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: true
        });
    }

    async handlePaymentSucceeded(invoice) {
        // Update subscription status and extend access
        console.log(`✅ Payment succeeded for customer: ${invoice.customer}`);
    }

    async handlePaymentFailed(invoice) {
        // Handle failed payment - maybe send notification email
        console.log(`❌ Payment failed for customer: ${invoice.customer}`);
    }

    // Create checkout session for plan upgrade
    async createCheckoutSession(userId, planName, successUrl, cancelUrl) {
        try {
            const user = await this.db.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const plan = this.pricingPlans[planName];
            if (!plan) {
                throw new Error('Invalid plan');
            }

            const session = await this.stripe.checkout.sessions.create({
                customer: user.stripe_customer_id,
                payment_method_types: ['card'],
                line_items: [{
                    price: plan.priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    user_id: userId,
                    plan_name: planName
                }
            });

            return session;

        } catch (error) {
            console.error('❌ Checkout session creation error:', error);
            throw error;
        }
    }

    // Get pricing plans
    getPricingPlans() {
        return Object.entries(this.pricingPlans).map(([key, plan]) => ({
            id: key,
            name: plan.name,
            price: plan.price,
            features: plan.features
        }));
    }
}

module.exports = ChefSocialAuth;