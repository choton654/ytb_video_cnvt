import Joi from '@hapi/joi';

export function validateSignupData(data) {
    const signupSchema = Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string(),
        email: Joi.string().required(),
        signUptype: Joi.string().required(),
        password: Joi.string().min(6).max(10),
    });
    return signupSchema.validate(data);
}
export function validateLoginData(data) {
    const loginSchema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().min(6).max(10),
    });
    return loginSchema.validate(data);
}