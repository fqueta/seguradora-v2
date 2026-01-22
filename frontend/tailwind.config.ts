import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/App.tsx",
		"./src/pages/**/*.{ts,tsx}",
		"./src/components/ui/**/*.{ts,tsx}",
		"./src/components/layout/**/*.{ts,tsx}",
		// exclude heavy folders to prevent EMFILE on limited environments
		"!./src/services/**/*",
		"!./src/lib/**/*",
		"!./src/types/**/*",
		"!./src/components/metrics/**/*",
		"!./src/pages/school/**/*",
	],
	safelist: [
		// common utilities used across the app
		'container','mx-auto','p-0','p-2','p-3','p-4','p-6','p-8',
		'm-0','m-2','m-3','m-4','mt-2','mt-3','mt-4','mb-2','mb-3','mb-4',
		'grid','grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4','gap-2','gap-3','gap-4','gap-6',
		'flex','inline-flex','items-center','justify-center','justify-between','justify-end','justify-start','flex-col','flex-row','flex-wrap',
		'w-full','max-w-full','h-full','min-h-[400px]',
		'rounded','rounded-md','rounded-lg','rounded-full',
		'border','border-muted','border-input',
		'bg-background','bg-muted','bg-primary','bg-secondary','bg-white',
		'text-foreground','text-muted-foreground','text-primary','text-secondary',
		'hover:bg-primary','hover:bg-secondary','hover:text-primary','hover:text-secondary',
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '0px',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
