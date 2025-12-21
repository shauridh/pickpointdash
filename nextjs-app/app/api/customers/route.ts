import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // TODO: Re-enable auth after fixing session
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    const customers = await prisma.customer.findMany({
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        packages: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform data to match frontend expectations
    const transformedCustomers = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phoneNumber,
      unitNumber: customer.unitNumber,
      locationId: customer.locationId,
      location: customer.location?.name || 'Lokasi Dihapus',
      isMember: customer.isMember,
      membershipExpiry: customer.membershipExpiry?.toISOString(),
      packageCount: customer.packages.length,
      lastActivity: customer.packages.length > 0
        ? customer.packages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt.toISOString()
        : customer.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: transformedCustomers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // TODO: Re-enable auth after fixing session
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    console.log("[api/customers] POST body:", body);
    const { name, phoneNumber, unitNumber, locationId } = body;

    if (!name || !phoneNumber || !unitNumber || !locationId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if customer already exists (relax: allow same phoneNumber reuse)
    // Only block exact same tenant for the same location + unit
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        AND: [
          { name },
          { unitNumber },
          { locationId }
        ]
      }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: "Customer with same name & unit already exists at this location" },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phoneNumber,
        unitNumber,
        locationId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phoneNumber,
        unitNumber: customer.unitNumber,
        locationId: customer.locationId,
        location: customer.location.name,
        isMember: customer.isMember,
        membershipExpiry: customer.membershipExpiry?.toISOString(),
        packageCount: 0,
        lastActivity: customer.createdAt.toISOString(),
      }
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create customer." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // TODO: Re-enable auth after fixing session
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    const { id, isMember, membershipExpiry, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const updatePayload: any = { ...updateData };

    // Handle membership updates
    if (isMember !== undefined) {
      updatePayload.isMember = isMember;
      if (isMember && membershipExpiry) {
        updatePayload.membershipExpiry = new Date(membershipExpiry);
      } else if (!isMember) {
        updatePayload.membershipExpiry = null;
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updatePayload,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        packages: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const transformedCustomer = {
      id: customer.id,
      name: customer.name,
      phone: customer.phoneNumber,
      unitNumber: customer.unitNumber,
      locationId: customer.locationId,
      location: customer.location?.name || 'Lokasi Dihapus',
      isMember: customer.isMember,
      membershipExpiry: customer.membershipExpiry?.toISOString(),
      packageCount: customer.packages.length,
      lastActivity: customer.packages.length > 0
        ? customer.packages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt.toISOString()
        : customer.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: transformedCustomer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update customer." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // TODO: Re-enable auth after fixing session
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete customer." },
      { status: 500 }
    );
  }
}
