import { prisma } from "../src/config";
import razorpay from "../src/config/razorpay";
import { PlanName } from "../src/generated/prisma/enums";


async function createPlans() {
    const plans = await prisma.plan.findMany({
        where: {
            name: {
                in: [
                    PlanName.STARTER,
                    PlanName.CREATOR,
                    PlanName.PRO,
                ],
            },
        },
    })

    for (const plan of plans) {
        console.log(`\nProcessing ${plan.name}...`);

        if (!plan.razorpayMonthlyPlanId) {
            const razorpayPlan = await razorpay.plans.create({
                period: "monthly",
                interval: 1,
                item: {
                    name: `LinkShift ${plan.name} Monthly`,
                    amount: plan.monthlyPrice * 100,
                    currency: "INR",
                    description: `LinkShift ${plan.name} plan billed monthly`,
                },
            });

            await prisma.plan.update({
                where: {
                    id: plan.id,
                },
                data: {
                    razorpayMonthlyPlanId: razorpayPlan.id,
                },
            });

            console.log(
                `${plan.name} monthly → ${razorpayPlan.id}`
            );
        } else {
            console.log(
                `${plan.name} monthly already exists -> ${plan.razorpayMonthlyPlanId}`
            );
        }


        if (!plan.razorpayYearlyPlanId) {
            const razorpayPlan = await razorpay.plans.create({
                period: "yearly",
                interval: 1,
                item: {
                    name: `LinkShift ${plan.name} Yearly`,
                    amount: plan.yearlyPrice! * 100,
                    currency: "INR",
                    description: `LinkShift ${plan.name} plan billed yearly`,
                },
            });

            await prisma.plan.update({
                where: {
                    id: plan.id,
                },
                data: {
                    razorpayYearlyPlanId: razorpayPlan.id,
                },
            });

            console.log(
                `${plan.name} yearly → ${razorpayPlan.id}`
            );
        } else {
            console.log(
                `${plan.name} yearly already exists -> ${plan.razorpayYearlyPlanId}`
            );
        }

        // USD BILLING
    //     if(!plan.razorpayUsdMonthlyPlanId) {
    //         const razorpayPlan = await razorpay.plans.create({
    //             period : "monthly",
    //             interval : 1,
    //             item : {
    //                 name : `LinkShift ${plan.name} Monthly USD`,
    //                 amount : plan.usdMonthlyPrice! *  100,
    //                 currency: "USD",
    //                 description: `LinkShift ${plan.name} plan billed monthly`
    //             }
    //         })

    //          await prisma.plan.update({
    //             where: {
    //                 id: plan.id,
    //             },
    //             data: {
    //                 razorpayUsdMonthlyPlanId: razorpayPlan.id,
    //             },
    //         });

    //         console.log(
    //             `${plan.name} USD monthly → ${razorpayPlan.id}`
    //         );
    //     } else {
    //         console.log(
    //             `${plan.name} USD monthly already exists -> ${plan.razorpayUsdMonthlyPlanId}`
    //         );
    //     }

    //     if (!plan.razorpayUsdYearlyPlanId) {
    //         const razorpayPlan = await razorpay.plans.create({
    //             period: "yearly",
    //             interval: 1,
    //             item: {
    //                 name: `LinkShift ${plan.name} Yearly USD`,
    //                 amount: plan.usdYearlyPrice! * 100,
    //                 currency: "USD",
    //                 description: `LinkShift ${plan.name} plan billed yearly`,
    //             },
    //         });

    //         await prisma.plan.update({
    //             where: {
    //                 id: plan.id,
    //             },
    //             data: {
    //                 razorpayUsdYearlyPlanId: razorpayPlan.id,
    //             },
    //         });

    //         console.log(
    //             `${plan.name} USD yearly → ${razorpayPlan.id}`
    //         );
    //     } else {
    //         console.log(
    //             `${plan.name} USD yearly already exists → ${plan.razorpayUsdYearlyPlanId}`
    //         );
    //     }

    }
}


createPlans()
    .then(async () => {
        console.log("\nRazorpay plans created successfully.");
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        console.error("Failed to create Razorpay plans:", error);
        await prisma.$disconnect();
        process.exit(1);
});
    
