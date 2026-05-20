import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.constants';
import { ElasticsearchService } from './elasticsearch.service';

@Global()
@Module({
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Client({ node: config.getOrThrow<string>('ELASTICSEARCH_URL') }),
    },
    ElasticsearchService,
  ],
  exports: [ElasticsearchService, ELASTICSEARCH_CLIENT],
})
export class ElasticsearchModule {}
