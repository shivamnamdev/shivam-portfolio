'use client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Loader2, ShieldAlert } from 'lucide-react';
import dynamic from 'next/dynamic';

// 🚨 Dynamically import Swagger to prevent SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// 🚨 SECURITY: Add the exact emails of people allowed to view the API Docs!
const ALLOWED_TESTERS =[
  "shivamnamdev.corp@gmail.com",
  "financetrail.bazar@gmail.com",
  "mavish.ps8@gmail.com",
  "shivamnamdev.edu@gmail.com"
];

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Shivam Academy API',
    version: '1.0.0',
    description: 'Internal API documentation for automated testing and Playwright E2E integration.',
  },
  servers:[
    { url: 'http://localhost:3000', description: 'Local Development Server' },
    { url: 'https://shivamnamdev.com', description: 'Production Server' }
  ],
  paths: {
    '/api/send-email': {
      post: {
        tags: ['Communications'],
        summary: 'Send Automated Email',
        description: 'Sends an email via the custom Gmail Nodemailer integration.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', example: 'Test User' }, email: { type: 'string', example: 'test@example.com' }, subject: { type: 'string', example: 'API Test' }, message: { type: 'string', example: 'Testing the API route.' } } } } } },
        responses: { '200': { description: 'Email sent successfully' }, '500': { description: 'Server Error' } }
      }
    },
    '/api/create-order': {
      post: {
        tags: ['Payments'],
        summary: 'Create Razorpay Order',
        description: 'Generates a secure Order ID for the checkout popup. Validates pricing and coupons.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { courseId: { type: 'string', example: 'python-beginners-live-01' }, currency: { type: 'string', example: 'INR' }, couponCode: { type: 'string', example: 'BIRTHDAY20' }, userId: { type: 'string', example: 'user_2aBcD...' } } } } } },
        responses: { '200': { description: 'Order created' }, '400': { description: 'Invalid Data' } }
      }
    },
    '/api/verify-payment': {
      post: {
        tags: ['Payments'],
        summary: 'Verify & Fulfill Razorpay Payment',
        description: 'Verifies the cryptographic signature from Razorpay, enrolls the user in Supabase, triggers an Admin log, and sends an HTML receipt.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { razorpay_order_id: { type: 'string', example: 'order_ABC123' }, razorpay_payment_id: { type: 'string', example: 'pay_XYZ987' }, razorpay_signature: { type: 'string', example: 'a1b2c3d4e5f6...' }, userId: { type: 'string', example: 'user_2aBcD...' }, courseSlug: { type: 'string', example: 'python-beginners' }, userEmail: { type: 'string', example: 'student@example.com' }, userName: { type: 'string', example: 'John Doe' }, courseTitle: { type: 'string', example: 'Python Live Session' }, amountPaid: { type: 'string', example: '₹599' }, couponCode: { type: 'string', example: '' } } } } } },
        responses: { '200': { description: 'Payment verified and enrolled' }, '400': { description: 'Invalid signature' } }
      }
    },
    '/api/enroll-free': {
      post: {
        tags: ['Payments'],
        summary: 'Process 100% Free Enrollment',
        description: 'Bypasses Razorpay entirely. Verifies a 100% off coupon and directly inserts the enrollment into Supabase.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { courseId: { type: 'string', example: 'python-beginners-live-01' }, courseSlug: { type: 'string', example: 'python-beginners' }, currency: { type: 'string', example: 'INR' }, couponCode: { type: 'string', example: 'BATCH002' }, userId: { type: 'string', example: 'user_2aBcD...' }, userName: { type: 'string', example: 'John Doe' }, userEmail: { type: 'string', example: 'student@example.com' } } } } } },
        responses: { '200': { description: 'Enrolled for free' }, '400': { description: 'Payment required (>0)' } }
      }
    },
    '/api/ai-tutor': {
      post: {
        tags: ['Integrations'],
        summary: 'Ask OpenAI Tutor',
        description: 'Securely pings OpenAI for a coding hint without exposing the API key.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string', example: 'prnt("Hello")' }, assignment: { type: 'string', example: 'Print Hello World' }, output: { type: 'string', example: 'NameError: name prnt is not defined' } } } } } },
        responses: { '200': { description: 'AI hint generated' } }
      }
    },
    '/api/get-clerk-users': {
      post: {
        tags: ['CRM / Admin'],
        summary: 'Get Specific Clerk Users',
        description: 'Takes an array of user IDs and fetches their Real Name, Email, and Avatar from Clerk backend.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { userIds: { type: 'array', items: { type: 'string' }, example: ["user_2aBcD...", "user_9zYxW..."] } } } } } },
        responses: { '200': { description: 'Returns a mapped dictionary of user data' } }
      }
    },
    '/api/get-all-users': {
      get: {
        tags: ['CRM / Admin'],
        summary: 'Get All Clerk Leads (Directory)',
        description: 'Fetches up to 100 recent users from Clerk to populate the Admin CRM directory.',
        responses: { '200': { description: 'Returns an array of user objects' } }
      }
    },
    '/api/webhooks/clerk': {
      post: {
        tags: ['Integrations'],
        summary: 'Clerk Webhook Receiver',
        description: 'Listens for user.created events from Clerk. Verifies the Svix signature, logs the signup to Supabase, and triggers the automated Welcome Email.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object' }, type: { type: 'string', example: 'user.created' } } } } } },
        responses: { '200': { description: 'Webhook processed' }, '400': { description: 'Svix signature failed' } }
      }
    }
  }
};

export default function ApiDocsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push('/');
      } else if (user.primaryEmailAddress?.emailAddress && ALLOWED_TESTERS.includes(user.primaryEmailAddress.emailAddress)) {
        setHasAccess(true); 
      } else {
        router.push('/learning');
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded || (!hasAccess && isSignedIn)) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="animate-spin text-amber-500" size={48} />
        </div>
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      {/* 🚨 THE FIX: Force load the official Swagger CSS securely via CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.css" />

      <Navbar />
      
      <main className="flex-grow w-full max-w-6xl mx-auto py-10 px-4">
        <div className="mb-6 flex items-center justify-between bg-stone-900 text-white p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-amber-500" />
            <h1 className="text-xl font-bold font-mono">Internal API Spec</h1>
          </div>
          <span className="text-xs font-mono bg-stone-800 px-3 py-1 rounded-full text-green-400">
            Access Granted: {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>

        {/* The Swagger UI will now inherit the injected CDN styles perfectly */}
        <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white p-4">
           <SwaggerUI spec={swaggerSpec} />
        </div>
      </main>

      <Footer />
    </div>
  );
}