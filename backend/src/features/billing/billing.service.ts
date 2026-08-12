import { prisma } from "../../config";
import { AppError } from "../../errors/AppError";
import razorpay from "../../config/razorpay";
import { CheckoutInput } from "./billing.validation";


export const checkoutService = async(userId : string, plan : CheckoutInput["plan"], billingCycle : CheckoutInput["billingCycle"]) => {
    const selectedPlan = await prisma.plan.findUnique({
        where : {
            name : plan
        }
    })

    if (!selectedPlan) {
        throw new AppError("Plan not found.", 404);
    }


    const amount = billingCycle === "MONTHLY" ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

    if (amount === null || amount === undefined) {
        throw new AppError("This plan does not support the selected billing cycle.", 400);
    }

    const amountInPaise = amount * 100;

    const order = await razorpay.orders.create({
        amount : amountInPaise,
        currency : "INR",
        receipt : `rcpt_${Date.now()}`,
        notes : {
            userId,
            planId: selectedPlan.id,
            plan: selectedPlan.name,
            billingCycle
        }
    })

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: selectedPlan.name,
        billingCycle
    };
}