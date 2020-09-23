import {Request, Response} from 'express';
import {SchemaError, Validator} from 'jsonschema';
import {AbstractController} from '../controllers/AbstractController';

export function WithBody(schema: any) {
    const validator = new Validator();
    validator.attributes.maxDigits = (instance, sc: any) => {
        if(typeof instance !== 'number') return undefined;
        if(typeof sc.maxDigits !== 'number' || Math.floor(sc.maxDigits) !== sc.maxDigits) {
            throw new SchemaError('"maxDigits" expects an integer', sc);
        }
        if(+instance.toFixed(sc.maxDigits) !== instance) {
            return 'has more precision than ' + sc.maxDigits + ' digits';
        }
        return undefined;
    };

    return function(_: AbstractController, __: string, descriptor: PropertyDescriptor) {
        if(typeof descriptor.value === 'function') {
            const previousMethod = descriptor.value;
            descriptor.value = function(this: AbstractController, req: Request, res: Response) {
                if(req.method.toUpperCase() !== 'POST' && req.method.toUpperCase() !== 'PUT') {
                    return previousMethod.call(this, req, res);
                }
                if(!req.body) {
                    res.status(400).json({
                        error: {
                            errorKey: 'client.body.missing',
                            additionalInfo: 'client.extended.badPayload'
                        }
                    });
                } else {
                    const result = validator.validate(req.body, schema);
                    if(result.valid) {
                        return previousMethod.call(this, req, res);
                    } else {
                        res.status(400).json({
                            error: {
                                errorKey: 'client.body.missing',
                                additionalInfo: 'client.extended.badPayload',
                                detailedInfo: result.errors
                            }
                        });
                    }
                }
            };
            return descriptor;
        }
        return undefined;
    };
}
