// ChefSocial Subscription Repository
// Handles all subscription-related database operations
class SubscriptionRepository {
    constructor(dbConnection) {
        this.db = dbConnection;
    }

    // Subscription CRUD Operations
    async createSubscription(subscriptionData) {
        const {
            id, userId, stripeSubscriptionId, stripePriceId, planName,
            status, currentPeriodStart, currentPeriodEnd, trialStart, trialEnd
        } = subscriptionData;

        const result = await this.db.run(`
            INSERT INTO subscriptions 
            (id, user_id, stripe_subscription_id, stripe_price_id, plan_name, status, 
             current_period_start, current_period_end, trial_start, trial_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, userId, stripeSubscriptionId, stripePriceId, planName, status, 
            currentPeriodStart, currentPeriodEnd, trialStart, trialEnd]);

        return { id, changes: result.changes };
    }

    async updateSubscription(stripeSubscriptionId, updateData) {
        const fields = [];
        const values = [];

        if (updateData.status !== undefined) {
            fields.push('status = ?');
            values.push(updateData.status);
        }
        if (updateData.currentPeriodStart !== undefined) {
            fields.push('current_period_start = ?');
            values.push(updateData.currentPeriodStart);
        }
        if (updateData.currentPeriodEnd !== undefined) {
            fields.push('current_period_end = ?');
            values.push(updateData.currentPeriodEnd);
        }
        if (updateData.cancelAtPeriodEnd !== undefined) {
            fields.push('cancel_at_period_end = ?');
            values.push(updateData.cancelAtPeriodEnd);
        }
        if (updateData.canceledAt !== undefined) {
            fields.push('canceled_at = ?');
            values.push(updateData.canceledAt);
        }
        if (updateData.planName !== undefined) {
            fields.push('plan_name = ?');
            values.push(updateData.planName);
        }
        if (updateData.stripePriceId !== undefined) {
            fields.push('stripe_price_id = ?');
            values.push(updateData.stripePriceId);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(stripeSubscriptionId);

        const result = await this.db.run(`
            UPDATE subscriptions 
            SET ${fields.join(', ')}
            WHERE stripe_subscription_id = ?
        `, values);

        return { changes: result.changes };
    }

    async updateSubscriptionByUserId(userId, updateData) {
        const fields = [];
        const values = [];

        if (updateData.status !== undefined) {
            fields.push('status = ?');
            values.push(updateData.status);
        }
        if (updateData.currentPeriodEnd !== undefined) {
            fields.push('current_period_end = ?');
            values.push(updateData.currentPeriodEnd);
        }
        if (updateData.cancelAtPeriodEnd !== undefined) {
            fields.push('cancel_at_period_end = ?');
            values.push(updateData.cancelAtPeriodEnd);
        }
        if (updateData.canceledAt !== undefined) {
            fields.push('canceled_at = ?');
            values.push(updateData.canceledAt);
        }

        if (fields.length === 0) {
            throw new Error('No fields provided for update');
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(userId);

        const result = await this.db.run(`
            UPDATE subscriptions 
            SET ${fields.join(', ')}
            WHERE user_id = ? AND status = 'active'
        `, values);

        return { changes: result.changes };
    }

    // Subscription Query Operations
    async getSubscriptionByStripeId(stripeSubscriptionId) {
        return await this.db.get(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.stripe_subscription_id = ?
        `, [stripeSubscriptionId]);
    }

    async getSubscriptionByUserId(userId) {
        return await this.db.get(`
            SELECT * FROM subscriptions 
            WHERE user_id = ? AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);
    }

    async getAllUserSubscriptions(userId) {
        return await this.db.all(`
            SELECT * FROM subscriptions 
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);
    }

    async getActiveSubscriptions(limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active'
            ORDER BY s.current_period_end DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    }

    async getSubscriptionsByPlan(planName, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.plan_name = ? AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT ? OFFSET ?
        `, [planName, limit, offset]);
    }

    async getSubscriptionsByStatus(status, limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = ?
            ORDER BY s.updated_at DESC
            LIMIT ? OFFSET ?
        `, [status, limit, offset]);
    }

    async getExpiringSubscriptions(daysFromNow = 7) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active' 
            AND s.current_period_end BETWEEN datetime('now') AND datetime('now', '+${daysFromNow} days')
            AND s.cancel_at_period_end = TRUE
            ORDER BY s.current_period_end ASC
        `);
    }

    async getCanceledSubscriptions(limit = 50, offset = 0) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'canceled' OR s.cancel_at_period_end = TRUE
            ORDER BY s.canceled_at DESC, s.current_period_end DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    }

    // Subscription Statistics
    async getSubscriptionStats() {
        const stats = await this.db.get(`
            SELECT 
                COUNT(*) as total_subscriptions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_subscriptions,
                COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
                COUNT(CASE WHEN cancel_at_period_end = TRUE THEN 1 END) as canceling_subscriptions,
                COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trial_subscriptions,
                COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as new_subscriptions_30d,
                COUNT(CASE WHEN canceled_at >= date('now', '-30 days') THEN 1 END) as canceled_30d
            FROM subscriptions
        `);

        const planStats = await this.db.all(`
            SELECT 
                plan_name,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
            FROM subscriptions
            GROUP BY plan_name
            ORDER BY count DESC
        `);

        const revenueStats = await this.db.get(`
            SELECT 
                COUNT(CASE WHEN plan_name = 'starter' AND status = 'active' THEN 1 END) as starter_count,
                COUNT(CASE WHEN plan_name = 'professional' AND status = 'active' THEN 1 END) as professional_count,
                COUNT(CASE WHEN plan_name = 'enterprise' AND status = 'active' THEN 1 END) as enterprise_count
            FROM subscriptions
        `);

        return {
            ...stats,
            plan_breakdown: planStats,
            revenue_breakdown: revenueStats
        };
    }

    async getMonthlySubscriptionGrowth(months = 12) {
        return await this.db.all(`
            SELECT 
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as new_subscriptions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_new
            FROM subscriptions 
            WHERE created_at >= date('now', '-${months} months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC
        `);
    }

    async getChurnRate(days = 30) {
        const result = await this.db.get(`
            SELECT 
                COUNT(CASE WHEN canceled_at >= date('now', '-${days} days') THEN 1 END) as canceled_count,
                COUNT(CASE WHEN created_at <= date('now', '-${days} days') AND status = 'active' THEN 1 END) as base_count
            FROM subscriptions
        `);

        const churnRate = result.base_count > 0 ? (result.canceled_count / result.base_count) * 100 : 0;
        
        return {
            canceled_count: result.canceled_count,
            base_count: result.base_count,
            churn_rate: churnRate,
            period_days: days
        };
    }

    // Subscription Management Operations
    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true, reason = null) {
        const fields = ['cancel_at_period_end = ?', 'updated_at = datetime(\'now\')'];
        const values = [cancelAtPeriodEnd];

        if (!cancelAtPeriodEnd) {
            fields.push('status = ?', 'canceled_at = datetime(\'now\')');
            values.push('canceled');
        }

        values.push(subscriptionId);

        const result = await this.db.run(`
            UPDATE subscriptions 
            SET ${fields.join(', ')}
            WHERE id = ? OR stripe_subscription_id = ?
        `, [...values, subscriptionId]);

        return { changes: result.changes };
    }

    async reactivateSubscription(subscriptionId) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET status = 'active', cancel_at_period_end = FALSE, canceled_at = NULL, updated_at = datetime('now')
            WHERE (id = ? OR stripe_subscription_id = ?) AND status = 'canceled'
        `, [subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    async pauseSubscription(subscriptionId, resumeAt = null) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET status = 'paused', updated_at = datetime('now')
            WHERE id = ? OR stripe_subscription_id = ?
        `, [subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    async upgradeSubscription(subscriptionId, newPlanName, newStripePriceId) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET plan_name = ?, stripe_price_id = ?, updated_at = datetime('now')
            WHERE id = ? OR stripe_subscription_id = ?
        `, [newPlanName, newStripePriceId, subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    async downgradeSubscription(subscriptionId, newPlanName, newStripePriceId) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET plan_name = ?, stripe_price_id = ?, updated_at = datetime('now')
            WHERE id = ? OR stripe_subscription_id = ?
        `, [newPlanName, newStripePriceId, subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    // Trial Management
    async getTrialSubscriptions() {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'trialing'
            ORDER BY s.trial_end ASC
        `);
    }

    async getExpiringTrials(daysFromNow = 3) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'trialing' 
            AND s.trial_end BETWEEN datetime('now') AND datetime('now', '+${daysFromNow} days')
            ORDER BY s.trial_end ASC
        `);
    }

    async extendTrial(subscriptionId, newTrialEnd) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET trial_end = ?, updated_at = datetime('now')
            WHERE (id = ? OR stripe_subscription_id = ?) AND status = 'trialing'
        `, [newTrialEnd, subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    // Payment and Billing
    async updateNextBillingDate(subscriptionId, nextBillingDate) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET current_period_end = ?, updated_at = datetime('now')
            WHERE id = ? OR stripe_subscription_id = ?
        `, [nextBillingDate, subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    async markSubscriptionPastDue(subscriptionId) {
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET status = 'past_due', updated_at = datetime('now')
            WHERE id = ? OR stripe_subscription_id = ?
        `, [subscriptionId, subscriptionId]);

        return { changes: result.changes };
    }

    async getSubscriptionsToProcess() {
        return await this.db.all(`
            SELECT s.*, u.email, u.name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active' 
            AND s.current_period_end <= datetime('now', '+1 day')
            ORDER BY s.current_period_end ASC
        `);
    }

    // Search and Filters
    async searchSubscriptions(searchTerm, limit = 20) {
        return await this.db.all(`
            SELECT s.*, u.email, u.name, u.restaurant_name
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE u.email LIKE ? OR u.name LIKE ? OR u.restaurant_name LIKE ? OR s.stripe_subscription_id LIKE ?
            ORDER BY s.created_at DESC
            LIMIT ?
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]);
    }

    async getSubscriptionsCount(filters = {}) {
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.status) {
            whereClause += ' AND s.status = ?';
            params.push(filters.status);
        }
        if (filters.planName) {
            whereClause += ' AND s.plan_name = ?';
            params.push(filters.planName);
        }
        if (filters.cancelAtPeriodEnd !== undefined) {
            whereClause += ' AND s.cancel_at_period_end = ?';
            params.push(filters.cancelAtPeriodEnd);
        }

        const result = await this.db.get(`
            SELECT COUNT(*) as count 
            FROM subscriptions s
            ${whereClause}
        `, params);
        
        return result.count;
    }

    // Cleanup Operations
    async cleanupCanceledSubscriptions(daysOld = 90) {
        const result = await this.db.run(`
            DELETE FROM subscriptions 
            WHERE status = 'canceled' 
            AND canceled_at <= date('now', '-${daysOld} days')
        `);

        return { changes: result.changes };
    }

    async archiveOldSubscriptions(daysOld = 365) {
        // This would typically move to an archive table
        // For now, we'll just mark them as archived
        const result = await this.db.run(`
            UPDATE subscriptions 
            SET status = 'archived', updated_at = datetime('now')
            WHERE status = 'canceled' 
            AND canceled_at <= date('now', '-${daysOld} days')
        `);

        return { changes: result.changes };
    }
}

module.exports = SubscriptionRepository;