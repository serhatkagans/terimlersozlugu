import {runtime} from '../../../lib/server';
import {imageEnabled,textEnabled} from '../../../lib/ai';
export const dynamic='force-dynamic';
export function GET(){return Response.json({ai:imageEnabled(),teacher:textEnabled(),admin:!!(runtime.ADMIN_USER&&runtime.ADMIN_PASSWORD)});}
