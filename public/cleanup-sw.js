// Service Worker Cleanup Script
// This script removes any lingering service workers that might cause issues

(function() {
    'use strict';
    
    console.log('🧹 ChefSocial: Cleaning up service workers...');
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            if (registrations.length === 0) {
                console.log('✅ No service workers found to clean up');
                return;
            }
            
            console.log(`🔄 Found ${registrations.length} service workers to unregister`);
            
            registrations.forEach(function(registration) {
                registration.unregister().then(function(success) {
                    if (success) {
                        console.log('✅ Service worker unregistered successfully');
                    }
                }).catch(function(error) {
                    console.log('❌ Service worker unregistration failed:', error);
                });
            });
        }).catch(function(error) {
            console.log('❌ Error getting service worker registrations:', error);
        });
    }
    
    // Clear any problematic caches
    if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
            if (cacheNames.length > 0) {
                console.log(`🗑️ Clearing ${cacheNames.length} caches`);
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        console.log('Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }
        }).then(function() {
            console.log('✅ All caches cleared');
        }).catch(function(error) {
            console.log('❌ Error clearing caches:', error);
        });
    }
    
    // Log completion
    console.log('✅ ChefSocial: Service worker cleanup completed');
})();