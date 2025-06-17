// ChefSocial Contrast Analyzer
// Automatically detects poor contrast ratios across your site

const fs = require('fs');
const path = require('path');

class ContrastAnalyzer {
    constructor() {
        this.wcagAA = 4.5;
        this.wcagAAA = 7.0;
        this.wcagAALarge = 3.0;
        this.issues = [];
    }

    // Convert hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Calculate relative luminance
    getLuminance(rgb) {
        const rsRGB = rgb.r / 255;
        const gsRGB = rgb.g / 255;
        const bsRGB = rgb.b / 255;

        const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
        const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
        const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // Calculate contrast ratio
    getContrastRatio(color1, color2) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return 1;

        const lum1 = this.getLuminance(rgb1);
        const lum2 = this.getLuminance(rgb2);

        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);

        return (brightest + 0.05) / (darkest + 0.05);
    }

    // Analyze your specific color combinations
    analyzeChefSocialColors() {
        console.log('🎨 ChefSocial Contrast Analysis\n');
        console.log('═'.repeat(50));

        const colorCombinations = [
            // Header combinations
            {
                name: 'Header - Logo on gradient',
                foreground: '#ffffff',
                background: '#ff6b35', // Approximate gradient
                element: 'Header logo',
                location: 'All pages'
            },
            {
                name: 'Header - Nav links on gradient',
                foreground: 'rgba(255, 255, 255, 0.9)',
                background: '#ff6b35',
                element: 'Navigation links',
                location: 'All pages'
            },
            {
                name: 'Header - Nav links (scrolled)',
                foreground: '#718096',
                background: '#ffffff',
                element: 'Navigation links (scrolled)',
                location: 'All pages'
            },
            {
                name: 'Header - Login button',
                foreground: 'rgba(255, 255, 255, 0.9)',
                background: 'rgba(255, 255, 255, 0.1)',
                element: 'Login button',
                location: 'All pages'
            },
            {
                name: 'Header - CTA button',
                foreground: '#ffffff',
                background: '#ff6b35',
                element: 'Get Started button',
                location: 'All pages'
            },
            // Main content combinations
            {
                name: 'Hero - Main heading',
                foreground: '#ffffff',
                background: '#d946ef', // Purple gradient
                element: 'Main heading',
                location: 'Homepage'
            },
            {
                name: 'Hero - Subtitle',
                foreground: '#ffffff',
                background: '#d946ef',
                element: 'Subtitle text',
                location: 'Homepage'
            },
            {
                name: 'Body - Main text',
                foreground: '#2d3748',
                background: '#ffffff',
                element: 'Body text',
                location: 'All pages'
            },
            {
                name: 'Mobile menu - Links',
                foreground: '#2d3748',
                background: 'rgba(255, 255, 255, 0.98)',
                element: 'Mobile menu links',
                location: 'Mobile view'
            }
        ];

        let passCount = 0;
        let failCount = 0;

        colorCombinations.forEach(combo => {
            // Handle rgba colors by converting to approximate hex
            let fg = combo.foreground;
            let bg = combo.background;

            // Convert common rgba values to hex approximations
            if (fg.includes('rgba(255, 255, 255, 0.9)')) fg = '#e6e6e6';
            if (bg.includes('rgba(255, 255, 255, 0.1)')) bg = '#f0f0f0';
            if (bg.includes('rgba(255, 255, 255, 0.98)')) bg = '#fefefe';

            const ratio = this.getContrastRatio(fg, bg);
            const passesAA = ratio >= this.wcagAA;
            const passesAAA = ratio >= this.wcagAAA;

            console.log(`\n📋 ${combo.name}`);
            console.log(`   Element: ${combo.element}`);
            console.log(`   Location: ${combo.location}`);
            console.log(`   Foreground: ${combo.foreground}`);
            console.log(`   Background: ${combo.background}`);
            console.log(`   Contrast Ratio: ${ratio.toFixed(2)}:1`);
            
            if (passesAAA) {
                console.log(`   ✅ EXCELLENT (AAA) - Passes all standards`);
                passCount++;
            } else if (passesAA) {
                console.log(`   ✅ GOOD (AA) - Meets accessibility standards`);
                passCount++;
            } else {
                console.log(`   ❌ FAIL - Below WCAG AA standard (needs ${this.wcagAA}:1)`);
                failCount++;
                this.issues.push({
                    element: combo.element,
                    location: combo.location,
                    ratio: ratio.toFixed(2),
                    required: this.wcagAA,
                    severity: ratio < 3 ? 'CRITICAL' : 'WARNING'
                });
            }
        });

        console.log('\n' + '═'.repeat(50));
        console.log('📊 SUMMARY');
        console.log('═'.repeat(50));
        console.log(`✅ Passing combinations: ${passCount}`);
        console.log(`❌ Failing combinations: ${failCount}`);
        console.log(`📈 Pass rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

        if (this.issues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES TO FIX:');
            this.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.element} (${issue.location})`);
                console.log(`   Current: ${issue.ratio}:1 | Required: ${issue.required}:1`);
                console.log(`   Severity: ${issue.severity}\n`);
            });
        } else {
            console.log('\n🎉 No critical contrast issues found!');
        }

        return this.issues;
    }

    // Generate improvement suggestions
    generateSuggestions() {
        if (this.issues.length === 0) return;

        console.log('\n💡 IMPROVEMENT SUGGESTIONS:');
        console.log('═'.repeat(50));

        this.issues.forEach((issue, index) => {
            console.log(`\n${index + 1}. ${issue.element}:`);
            
            if (issue.element.includes('gradient')) {
                console.log('   • Consider adding text shadows or outlines');
                console.log('   • Use darker gradient stops behind text');
                console.log('   • Add semi-transparent background overlay');
            }
            
            if (issue.element.includes('rgba')) {
                console.log('   • Increase alpha opacity for better contrast');
                console.log('   • Use solid colors instead of transparent ones');
            }
            
            if (issue.severity === 'CRITICAL') {
                console.log('   • 🔥 URGENT: This severely impacts accessibility');
                console.log('   • Consider completely different color combination');
            }
        });
    }
}

// Run the analysis
console.clear();
const analyzer = new ContrastAnalyzer();
const issues = analyzer.analyzeChefSocialColors();
analyzer.generateSuggestions();

console.log('\n🔧 NEXT STEPS:');
console.log('1. Fix any critical issues immediately');
console.log('2. Test with browser DevTools for real-time validation');
console.log('3. Use browser extensions like axe or WAVE for comprehensive testing');
console.log('4. Test with actual users who have visual impairments');

module.exports = ContrastAnalyzer; 