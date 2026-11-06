import { redirect } from 'next/navigation';

// The classic "Admin Command Center" was replaced by the admin portal (SCP-89, phase 4). /admin keeps working as an address: anyone who opens
// it lands on the new Overview, whose layout checks who they are (a visitor goes to the home page, a signed-in learner to /learning).
export default function AdminIndex() {
  redirect('/admin/overview');
}
