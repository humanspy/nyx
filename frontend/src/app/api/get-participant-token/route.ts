import {NextRequest, NextResponse} from "next/server";

export const GET = (req: NextRequest) => {
    const room = req.nextUrl.searchParams.get('room');
    const username = req.nextUrl.searchParams.get('username');

    if (!room || !username) {
        return NextResponse.json(
            { error: 'Room and username are required' },
            { status: 400 }
        );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

}
