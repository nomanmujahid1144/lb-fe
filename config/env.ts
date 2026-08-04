// config/env.ts

interface EnvConfig {
    NODE_ENV: string;
    BACKEND_URL: string;
}

const env: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:1337',
};

export default env;