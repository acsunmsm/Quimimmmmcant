import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.ts',timeout:120000,workers:1,reporter:'list',use:{baseURL:'http://localhost:9002',viewport:{width:1440,height:1000},headless:true,navigationTimeout:120000,launchOptions:{channel:'msedge',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}}});

