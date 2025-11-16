import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwrite-server';
import { getUsageStats } from '@/lib/usage-tracking';

export async function GET(req: NextRequest) {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    const usage = await getUsageStats(user.$id);

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('[Usage API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
