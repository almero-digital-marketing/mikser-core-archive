import { onPersist, onLoaded, useLogger, constants, mikser, useOperations, normalize } from 'mikser-core'
import _ from 'lodash'
import path from 'path'
import { mkdir, writeFile, unlink } from 'fs/promises'
import yaml from 'yamljs'

async function saveEntity(entity, use) {
    const entityFile = path.join(mikser.options.archivesFolder, `${entity.name}.yml`)
    const normalized = normalize(_.get(entity, use))
    const entityDump = yaml.dump(normalized)

    await mkdir(path.dirname(entityFile), { recursive: true })
    await writeFile(entityFile, entityDump, 'utf8')
}

async function deleteEntity(entity) {
    const entityName = entity.name || entity.id.replace(`/${entity.collection}`, '').replace(path.extname(entity.id), '')
    const entityFile = path.join(mikser.options.archivesFolder, `${entityName}.yml`)
    await unlink(entityFile)
}

onLoaded(async () => {
    const logger = useLogger()
    mikser.options.archives = mikser.config.archives?.archivesFolder || 'archives'
    mikser.options.archivesFolder = path.join(mikser.options.workingFolder, mikser.options.archives)

    logger.info('Archives folder: %s', mikser.options.archivesFolder)
    await mkdir(mikser.options.archivesFolder, { recursive: true })
})

onPersist(async () => {
    const logger = useLogger()

    for (let { match, use = 'meta' } of mikser.config.archive?.archives || []) {        

        const operations = useOperations([constants.OPERATION_CREATE, constants.OPERATION_UPDATE, constants.OPERATION_DELETE])
        .filter(({ entity }) => {
            return entity.meta && _.isMatch(entity, match)
        })

        for (let { operation, entity } of operations) {
            switch (operation) {
                case constants.OPERATION_CREATE:
                    logger.trace('Archive %s %s: %s', entity.collection, operation, entity.id)
                    await saveEntity(entity, use)
                break
                case constants.OPERATION_UPDATE:
                    logger.trace('Archive %s %s: %s', entity.collection, operation, entity.id)
                    await saveEntity(entity, use)
                break
                case constants.OPERATION_DELETE:
                    deleteEntity(entity)
                break
            }
        }
    }
})
