import { Global, Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport';


@Global()
@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt'
        }),
    ],
    controllers: [],
    providers: [],
    exports: [PassportModule],
})

export class GlobalPassportModule { }