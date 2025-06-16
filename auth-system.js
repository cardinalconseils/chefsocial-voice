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
        
        // ChefSocial Complete Plan - Single pricing model with usage-based overages
        this.pricingPlan = {
            complete: {
                priceId: process.env.STRIPE_PRICE_COMPLETE || 'price_complete_test',
                name: 'ChefSocial Complete',
                price: 7900, // $79.00/month
                displayPrice: '$79',
                description: 'Every feature we\'ve built, in one package',
                features: [
                    'Voice content creation - 300 minutes/month included',
                    'AI image generation - 30 images/month included',
                    'Smart video creation - 10 videos/month included',
                    'All platform posting - Unlimited posts',
                    'Review monitoring - All major platforms',
                    'Team collaboration - 2 users included',
                    'Multi-location - 1 location included',
                    'Advanced analytics & insights',
                    'POS & reservation integrations',
                    'White-label options available',
                    'Email & chat support'
                ],
                limits: {
                    voice_minutes_per_month: 300,
                    images_per_month: 30,
                    videos_per_month: 10,
                    posts_per_month: -1, // unlimited
                    team_users: 2,
                    locations: 1,
                    api_calls_per_month: 1000,
                    all_features: true
                }
            }
        };

        // Usage-based overage pricing
        this.overagePricing = {
            voice_minutes: {
                priceId: process.env.STRIPE_PRICE_VOICE_OVERAGE || 'price_voice_overage_test',
                price: 15, // $0.15 per minute in cents
                displayPrice: '$0.15/minute',
                description: 'Voice content creation overages'
            },
            images: {
                priceId: process.env.STRIPE_PRICE_IMAGE_OVERAGE || 'price_image_overage_test',
                price: 50, // $0.50 per image in cents
                displayPrice: '$0.50/image',
                description: 'AI image generation overages'
            },
            videos: {
                priceId: process.env.STRIPE_PRICE_VIDEO_OVERAGE || 'price_video_overage_test',
                price: 150, // $1.50 per video in cents
                displayPrice: '$1.50/video',
                description: 'Smart video creation overages'
            },
            extra_locations: {
                priceId: process.env.STRIPE_PRICE_EXTRA_LOCATION || 'price_extra_location_test',
                price: 2500, // $25.00 per location per month in cents
                displayPrice: '$25/location/month',
                description: 'Additional locations'
            },
            extra_users: {
                priceId: process.env.STRIPE_PRICE_EXTRA_USER || 'price_extra_user_test',
                price: 1500, // $15.00 per user per month in cents
                displayPrice: '$15/user/month',
                description: 'Additional team members'
            },
            api_calls: {
                priceId: process.env.STRIPE_PRICE_API_OVERAGE || 'price_api_overage_test',
                price: 5, // $0.05 per 100 calls in cents
                displayPrice: '$0.05/100 calls',
                description: 'Extra API calls'
            }
        };
    }

    // Registration with Stripe
    async registerUser(userData) {
        try {
            const { email, password, name, restaurantName, paymentMethodId } = userData;
            const planName = 'complete'; // Only one plan available

            // Check if user already exists
            const existingUser = await this.db.getUserByEmail(email);
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Get plan details
            const plan = this.pricingPlan[planName];
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

    // Get pricing plan and overage structure
    getPricingPlan() {
        const plan = this.pricingPlan.complete;
        return {
            plan: {
                id: 'complete',
                name: plan.name,
                price: plan.price,
                displayPrice: plan.displayPrice,
                description: plan.description,
                features: plan.features,
                limits: plan.limits
            },
            overages: Object.entries(this.overagePricing).map(([key, overage]) => ({
                id: key,
                price: overage.price,
                displayPrice: overage.displayPrice,
                description: overage.description
            }))
        };
    }

    // Get Stripe products with live pricing
    async getStripeProducts() {
        try {
            const products = await this.stripe.products.list({
                active: true
            });

            // Get prices for products with our plan_key metadata
            const productsWithPrices = await Promise.all(
                products.data.map(async (product) => {
                    let price = null;
                    
                    if (product.metadata.plan_key) {
                        // Get prices for this product
                        const prices = await this.stripe.prices.list({
                            product: product.id,
                            active: true
                        });
                        
                        if (prices.data.length > 0) {
                            const mainPrice = prices.data[0];
                            price = {
                                id: mainPrice.id,
                                amount: mainPrice.unit_amount,
                                currency: mainPrice.currency,
                                interval: mainPrice.recurring?.interval,
                                interval_count: mainPrice.recurring?.interval_count
                            };
                        }
                    }

                    return {
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: price,
                        metadata: product.metadata,
                        features: product.metadata?.features ? JSON.parse(product.metadata.features) : []
                    };
                })
            );

            return productsWithPrices;
        } catch (error) {
            console.error('❌ Error fetching Stripe products:', error);
            throw error;
        }
    }

    // Create or update Stripe products to match our pricing plan
    async syncStripeProducts() {
        try {
            // Sync main plan
            const plan = this.pricingPlan.complete;
            await this.createOrUpdateStripeProduct('complete', plan);

            // Sync overage pricing
            for (const [overageKey, overage] of Object.entries(this.overagePricing)) {
                await this.createOrUpdateStripeProduct(overageKey, overage, true);
            }
        } catch (error) {
            console.error('❌ Error syncing Stripe products:', error);
            throw error;
        }
    }

    async createOrUpdateStripeProduct(key, productData, isOverage = false) {
        try {
            // Check if product exists
            let product;
            try {
                const products = await this.stripe.products.search({
                    query: `metadata['product_key']:'${key}'`
                });
                product = products.data[0];
            } catch (error) {
                // Product doesn't exist, will create new one
            }

            if (!product) {
                // Create new product
                const productMetadata = {
                    product_key: key,
                    is_overage: isOverage ? 'true' : 'false'
                };

                if (!isOverage) {
                    productMetadata.features = JSON.stringify(productData.features);
                }

                product = await this.stripe.products.create({
                    name: productName,
                    description: productData.description,
                    metadata: productMetadata
                });

                // Create price for the product
                const priceData = {
                    product: product.id,
                    unit_amount: productData.price,
                    currency: 'usd',
                    metadata: {
                        product_key: key
                    }
                };

                // For main plan, add recurring billing
                if (!isOverage) {
                    priceData.recurring = {
                        interval: 'month'
                    };
                }

                const price = await this.stripe.prices.create(priceData);

                // Update pricing structure with actual Stripe price ID
                if (isOverage) {
                    this.overagePricing[key].priceId = price.id;
                } else {
                    this.pricingPlan[key].priceId = price.id;
                }
                
                console.log(`✅ Created Stripe product ${productName} with price ${price.id}`);
            }
        } catch (error) {
            console.error(`❌ Error creating Stripe product for ${key}:`, error);
            throw error;
        }
    }
}

module.exports = ChefSocialAuth;