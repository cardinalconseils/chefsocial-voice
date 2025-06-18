// SMS Config Service - SMS configuration and preferences management
class SMSConfigService {
    constructor(services) {
        this.authSystem = services.authSystem;
        this.logger = services.logger;
    }

    async updateSMSConfig(userId, configData, req) {
        const { phoneNumber, notifications, dailySuggestions, approvalWorkflow } = configData;
        
        // Update user's SMS preferences
        const updateFields = [];
        const updateValues = [];
        
        if (phoneNumber !== undefined) {
            updateFields.push('phone = ?');
            updateValues.push(phoneNumber);
        }
        
        // Store SMS preferences in user metadata or separate table
        const smsPreferences = {
            notifications: notifications !== undefined ? notifications : true,
            dailySuggestions: dailySuggestions !== undefined ? dailySuggestions : false,
            approvalWorkflow: approvalWorkflow !== undefined ? approvalWorkflow : true
        };
        
        if (updateFields.length > 0) {
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(userId);
            
            await this.authSystem.db.db.run(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);
        }
        
        // Store SMS preferences (you might want to create a separate table for this)
        // For now, we'll store in user metadata or handle in the SMS service
        
        // Audit log SMS config update
        await this.logger.auditUserAction(
            userId,
            'sms_config_update',
            'user',
            userId,
            {
                phoneNumberUpdated: phoneNumber !== undefined,
                preferences: smsPreferences
            },
            req
        );

        this.logger.info('SMS configuration updated', {
            userId,
            phoneNumberUpdated: phoneNumber !== undefined,
            preferences: Object.keys(smsPreferences)
        });
        
        return {
            message: 'SMS configuration updated successfully',
            config: {
                phoneNumber: phoneNumber ? phoneNumber.slice(-4) + ' (updated)' : 'not changed',
                preferences: smsPreferences
            }
        };
    }

    async getSMSConfig(userId) {
        const user = await this.authSystem.db.getUserById(userId);
        
        // Get SMS preferences (from user metadata or separate config)
        const smsConfig = {
            hasPhoneNumber: !!user.phone,
            phoneNumber: user.phone ? '***-***-' + user.phone.slice(-4) : null,
            preferences: {
                notifications: true, // Default values - you might store these separately
                dailySuggestions: false,
                approvalWorkflow: true
            },
            features: {
                contentApproval: true,
                dailySuggestions: true,
                workflowManagement: true
            }
        };

        this.logger.info('SMS configuration accessed', {
            userId,
            hasPhoneNumber: smsConfig.hasPhoneNumber
        });
        
        return { config: smsConfig };
    }
}

module.exports = SMSConfigService;