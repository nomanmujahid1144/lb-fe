import RegisterForm from '@/components/auth/RegisterForm';
import { redirect } from 'next/navigation';

export default function RegisterPage() {
    // redirect('/auth/login');
    return <RegisterForm />; 
}
