import Razorpay from 'razorpay';
import axios from 'axios';
import { config } from './env';

const razorpay = new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
});

(razorpay.api as any).rq.defaults.adapter = axios.getAdapter('http');

export default razorpay;