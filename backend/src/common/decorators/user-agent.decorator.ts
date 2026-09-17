import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UAParser } from 'ua-parser-js'

export const ParsedUserAgent = createParamDecorator(
    (date : unknown,ctx : ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const uaString = request.headers['user-agent'] || "";

        const parser = new UAParser(uaString)

        return parser.getResult() 
        /***
         * browser, engine , os , device
         */
    }
)