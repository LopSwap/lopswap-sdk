import {
  MarkdownTheme,
  MarkdownThemeContext,
  MemberRouter,
} from 'typedoc-plugin-markdown'
import { PageKind, ReflectionKind } from 'typedoc'

class LopSwapThemeContext extends MarkdownThemeContext {
  constructor(theme, page, options) {
    super(theme, page, options)
    const renderReflection = this.templates.reflection
    this.templates.reflection = (reflectionPage) => {
      if (reflectionPage.model === reflectionPage.project) {
        return renderIndex.call(this, reflectionPage)
      }

      const comment = reflectionPage.model.comment
      const originalTags = comment?.blockTags
      if (comment) {
        comment.blockTags = comment.blockTags.filter(
          (tag) => tag.tag !== '@sortStrategy',
        )
      }

      try {
        return renderReflection(reflectionPage)
      } finally {
        if (comment && originalTags) comment.blockTags = originalTags
      }
    }
    const renderSignature = this.partials.signature
    this.partials.signature = (model, signatureOptions) =>
      renderSignatureWithBadges.call(
        this,
        renderSignature,
        model,
        signatureOptions,
      )
    this.partials.parametersList = renderParameters.bind(this)
    this.partials.signatureParameters = renderSignatureParameters.bind(this)
    const renderReturns = this.partials.signatureReturns
    this.partials.signatureReturns = (model, returnOptions) =>
      renderReturnsWithFields.call(this, renderReturns, model, returnOptions)
    const renderPageTitle = this.partials.pageTitle
    this.partials.pageTitle = () =>
      this.page.model.kind === ReflectionKind.Constructor
        ? 'Constructor: new LopSwap()'
        : renderPageTitle()
    const renderConstructor = this.partials.constructor
    this.partials.constructor = (model, constructorOptions) =>
      this.router.hasOwnDocument(model)
        ? model.signatures
            ?.map((signature) =>
              this.partials.signature(signature, {
                headingLevel: constructorOptions.headingLevel + 1,
              }),
            )
            .join('\n\n') || ''
        : renderConstructor(model, constructorOptions)
  }
}

class LopSwapTheme extends MarkdownTheme {
  getRenderContext(page) {
    return new LopSwapThemeContext(this, page, this.application.options)
  }
}

class LopSwapRouter extends MemberRouter {
  constructor(application) {
    super(application)
    this.membersWithOwnFile.push('Method', 'Constructor')
    this.kindsToString.set(ReflectionKind.Method, 'Method')
    this.kindsToString.set(ReflectionKind.Constructor, 'Constructor')
  }

  getPageKind(reflection) {
    if (
      reflection.parent?.name === 'LopSwap' &&
      reflection.kindOf(ReflectionKind.Method | ReflectionKind.Constructor)
    ) {
      return PageKind.Reflection
    }

    return super.getPageKind(reflection)
  }

  buildPages(project) {
    const pages = super.buildPages(project)
    const clientPage = pages.find(
      (page) =>
        page.model.kind === ReflectionKind.Class &&
        page.model.name === 'LopSwap',
    )

    if (clientPage) {
      this.fullUrls.set(clientPage.model, this.fullUrls.get(project))
    }

    for (const page of pages) {
      if (page.model.kind !== ReflectionKind.Variable) continue

      const typeAlias = page.model.parent?.children?.find(
        (reflection) =>
          reflection.kind === ReflectionKind.TypeAlias &&
          reflection.name === page.model.name,
      )
      if (typeAlias && this.fullUrls.has(typeAlias)) {
        this.fullUrls.set(page.model, this.fullUrls.get(typeAlias))
      } else {
        this.fullUrls.delete(page.model)
      }

      page.model.traverse((child) => {
        this.fullUrls.delete(child)
        this.anchors.delete(child)
        return true
      })
    }

    return pages.filter(
      (page) =>
        page !== clientPage && page.model.kind !== ReflectionKind.Variable,
    )
  }

  getIdealBaseName(reflection) {
    if (
      reflection.parent?.name === 'LopSwap' &&
      reflection.kindOf(ReflectionKind.Method | ReflectionKind.Constructor)
    ) {
      const name =
        reflection.kind === ReflectionKind.Constructor
          ? 'constructor'
          : this.getReflectionAlias(reflection)
      return `methods/${name}`
    }

    return super.getIdealBaseName(reflection)
  }
}

export function load(app) {
  app.renderer.defineTheme('lopswap', LopSwapTheme)
  app.renderer.defineRouter('lopswap', LopSwapRouter)
}

function renderSignatureWithBadges(renderSignature, model, options) {
  const comment = options.multipleSignatures
    ? model.comment
    : model.comment || model.parent?.comment
  const isLopSwapConstructor =
    model.kind === ReflectionKind.ConstructorSignature &&
    model.name === 'LopSwap'
  const mode = isLopSwapConstructor ? 'Local' : execution(comment)

  if (!mode) return renderSignature(model, options)

  const originalTags = comment?.blockTags
  if (comment) {
    comment.blockTags = comment.blockTags.filter(
      (tag) => tag.tag !== '@remarks' || !executionTag(tag),
    )
  }

  try {
    return `${executionBadges(mode)}\n\n${renderSignature(model, options)}`
  } finally {
    if (comment && originalTags) comment.blockTags = originalTags
  }
}

function executionBadges(mode) {
  return mode
    .split(/\s*\+\s*/)
    .map((label) => `<kbd>${escapeHtml(label)}</kbd>`)
    .join(' ')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderIndex(page) {
  const children = page.model.children ?? []
  const client = children.find((reflection) => reflection.name === 'LopSwap')
  const errors = children.filter((reflection) =>
    ['LopSwapHttpError', 'LopSwapValidationError'].includes(reflection.name),
  )
  const output = ['# @lopswap/sdk']

  if (client) {
    const description = summary.call(this, client.comment)
    if (description) output.push(description)

    const members = (client.children ?? []).filter(
      (reflection) => reflection.signatures?.length,
    )
    const constructor = members.find(
      (reflection) => reflection.name === 'constructor',
    )
    const methods = members.filter(
      (reflection) => reflection.name !== 'constructor',
    )

    if (constructor) {
      output.push(
        '## Constructor',
        methodsTable([methodRow.call(this, constructor, true)]),
      )
    }

    if (methods.length) {
      output.push('## Methods')
      const methodIds = new Set(methods.map((method) => method.id))
      const renderedIds = new Set()

      for (const group of client.groups ?? []) {
        const groupMethods = group.children.filter(
          (method) => methodIds.has(method.id) && !renderedIds.has(method.id),
        )
        if (!groupMethods.length) continue

        groupMethods.forEach((method) => renderedIds.add(method.id))
        output.push(
          `### ${group.title === 'Methods' ? 'Other methods' : group.title}`,
          methodsTable(
            groupMethods.map((method) => methodRow.call(this, method)),
          ),
        )
      }

      const ungrouped = methods.filter((method) => !renderedIds.has(method.id))
      if (ungrouped.length) {
        output.push(
          '### Other methods',
          methodsTable(ungrouped.map((method) => methodRow.call(this, method))),
        )
      }
    }
  }

  if (errors.length) {
    output.push(
      '## Errors',
      errors
        .map(
          (error) =>
            `- [\`${error.name}\`](${this.urlTo(error)}) — ${summary.call(this, error.comment)}`,
        )
        .join('\n'),
    )
  }

  return output.join('\n\n')
}

function methodRow(method, constructor = false) {
  const signature = method.signatures[0]
  return [
    `[\`${constructor ? 'new LopSwap' : method.name}()\`](${this.urlTo(method)})`,
    constructor ? 'Local' : execution(signature?.comment ?? method.comment),
    summary.call(this, signature?.comment ?? method.comment),
  ]
}

function methodsTable(rows) {
  return [
    '| Method | Execution | Description |',
    '| :-- | :-- | :-- |',
    ...rows.map((row) => `| ${row.map(tableCell).join(' | ')} |`),
  ].join('\n')
}

function summary(comment) {
  if (!comment?.summary?.length) return ''
  return this.helpers.getCommentParts(comment.summary).split('\n\n')[0]
}

function execution(comment) {
  const remarks = comment?.blockTags?.find(
    (tag) => tag.tag === '@remarks' && executionTag(tag),
  )
  return remarks ? executionTag(remarks) : ''
}

function executionTag(tag) {
  const content = tag.content.map((part) => part.text).join('')
  const match = content.match(/^\*\*Execution:\*\*\s*(.+)$/)
  return match?.[1]?.trim() ?? ''
}

function renderSignatureParameters(parameters) {
  const multiline = parameters.length > 2
  const separator = multiline ? ',\n   ' : ', '
  const body = parameters
    .map((parameter) => {
      const optional =
        parameter.flags.isOptional || parameter.defaultValue ? '?' : ''
      const rest = parameter.flags.isRest ? '...' : ''
      const type = this.partials.someType(parameter.type, {
        forceCollapse: true,
      })
      return `${rest}${parameter.name}${optional}: ${compactType(parameter.type, type)}`
    })
    .join(separator)

  return multiline ? `(\n   ${body}\n)` : `(${body})`
}

function renderParameters(parameters, options) {
  const output = [parametersTable.call(this, parameters)]

  for (const parameter of parameters) {
    const variants = getObjectVariants(parameter.type)
    if (!variants.length) continue

    output.push(heading(options.headingLevel + 1, `${parameter.name} fields`))
    for (const variant of variants) {
      if (variants.length > 1) {
        output.push(`**${variantLabel.call(this, variant)}**`)
      }
      output.push(propertiesTable.call(this, variant.children))
    }
  }

  return output.join('\n\n')
}

function renderReturnsWithFields(renderReturns, model, options) {
  const output = [renderReturns(model, options)]
  if (model.kind === ReflectionKind.ConstructorSignature) return output[0]

  const variants = getReturnObjectVariants(model.type)
  if (!variants.length) return output[0]

  if (variants.length === 1 && variants[0].items) output.push('Each item:')

  for (const variant of variants) {
    if (variants.length > 1) {
      output.push(`**${returnVariantLabel.call(this, variant)}**`)
    }
    output.push(returnPropertiesTable.call(this, variant.children))
  }

  return output.join('\n\n')
}

function getReturnObjectVariants(type, seen = new Set(), items = false) {
  if (!type) return []

  if (type.type === 'array') {
    return getReturnObjectVariants(type.elementType, seen, true)
  }

  if (type.type === 'typeOperator') {
    return getReturnObjectVariants(type.target, seen, items)
  }

  if (type.type === 'reference') {
    if (
      ['Promise', 'Array', 'ReadonlyArray'].includes(type.name) &&
      type.typeArguments?.length === 1
    ) {
      return getReturnObjectVariants(
        type.typeArguments[0],
        seen,
        items || type.name !== 'Promise',
      )
    }

    const reflection = type.reflection
    if (!reflection || seen.has(reflection.id)) return []

    const nextSeen = new Set(seen).add(reflection.id)
    if (reflection.children?.length) {
      return [{ type, children: reflection.children, items }]
    }
    if (reflection.type) {
      return getReturnObjectVariants(reflection.type, nextSeen, items)
    }
    return []
  }

  if (type.type === 'reflection' && type.declaration.children?.length) {
    return [{ type, children: type.declaration.children, items }]
  }

  if (type.type === 'union') {
    return type.types.flatMap((member) =>
      getReturnObjectVariants(member, seen, items),
    )
  }

  return []
}

function returnVariantLabel(variant) {
  const label = variantLabel.call(this, variant)
  return variant.items ? `${label} items` : label
}

function getObjectVariants(type, seen = new Set()) {
  if (!type) return []

  if (type.type === 'array') {
    return getObjectVariants(type.elementType, seen)
  }

  if (type.type === 'typeOperator') {
    return getObjectVariants(type.target, seen)
  }

  if (type.type === 'reference') {
    if (
      ['Array', 'ReadonlyArray'].includes(type.name) &&
      type.typeArguments?.length === 1
    ) {
      return getObjectVariants(type.typeArguments[0], seen)
    }

    const reflection = type.reflection
    if (!reflection || seen.has(reflection.id)) return []

    const nextSeen = new Set(seen).add(reflection.id)
    if (reflection.children?.length) {
      return [{ type, children: reflection.children }]
    }
    if (reflection.type) {
      return getObjectVariants(reflection.type, nextSeen)
    }
    return []
  }

  if (type.type === 'reflection' && type.declaration.children?.length) {
    return [{ type, children: type.declaration.children }]
  }

  if (type.type === 'union') {
    return type.types.flatMap((member) => getObjectVariants(member, seen))
  }

  return []
}

function variantLabel(variant) {
  const discriminator = variant.children.find(
    (property) => property.name === 'type' && property.type?.type === 'literal',
  )

  if (discriminator) {
    return `\`${String(discriminator.type.value)}\``
  }

  return this.partials.someType(variant.type, { forceCollapse: true })
}

function propertiesTable(properties) {
  const rows = properties.map((property) => [
    `\`${property.name}\``,
    parameterType.call(this, property.type),
    property.flags.isOptional ? 'No' : 'Yes',
    property.comment ? this.partials.comment(property.comment) : '',
  ])

  return [
    '| Parameter | Type | Required | Description |',
    '| :-- | :-- | :--: | :-- |',
    ...rows.map((row) => `| ${row.map(tableCell).join(' | ')} |`),
  ].join('\n')
}

function returnPropertiesTable(properties) {
  const hasDescriptions = properties.some(
    (property) =>
      property.comment?.summary?.length || property.comment?.blockTags?.length,
  )
  const rows = properties.map((property) => {
    const row = [
      `\`${property.name}\``,
      parameterType.call(this, property.type),
      property.flags.isOptional ? 'No' : 'Yes',
    ]
    if (hasDescriptions) {
      row.push(property.comment ? this.partials.comment(property.comment) : '')
    }
    return row
  })

  return [
    hasDescriptions
      ? '| Field | Type | Required | Description |'
      : '| Field | Type | Required |',
    hasDescriptions ? '| :-- | :-- | :--: | :-- |' : '| :-- | :-- | :--: |',
    ...rows.map((row) => `| ${row.map(tableCell).join(' | ')} |`),
  ].join('\n')
}

function parametersTable(parameters) {
  const rows = parameters.map((parameter) => [
    `\`${parameter.name}\``,
    parameterType.call(this, parameter.type),
    parameter.flags.isOptional || parameter.defaultValue ? 'No' : 'Yes',
    parameter.comment ? this.partials.comment(parameter.comment) : '',
  ])

  return markdownTable(rows)
}

function markdownTable(rows) {
  return [
    '| Parameter | Type | Required | Description |',
    '| :-- | :-- | :--: | :-- |',
    ...rows.map((row) => `| ${row.map(tableCell).join(' | ')} |`),
  ].join('\n')
}

function parameterType(type) {
  if (isEmptyObject(type)) return '`object`'

  const rendered = this.partials.someType(type, { forceCollapse: true })
  return compactType(type, rendered, ' or ')
}

function compactType(type, rendered, unionSeparator = ' | ') {
  if (isEmptyObject(type)) return 'object'

  const compact = rendered
    .replace(/\r?\n+/g, ' ')
    .replace(/\s*\\?\|\s*/g, unionSeparator)
    .trim()
  const prefix = unionSeparator.trim()
  return compact.startsWith(prefix)
    ? compact.slice(prefix.length).trimStart()
    : compact
}

function isEmptyObject(type) {
  return (
    type?.type === 'reflection' &&
    !type.declaration.children?.length &&
    !type.declaration.signatures?.length
  )
}

function heading(level, text) {
  return `${'#'.repeat(level)} ${text}`
}

function tableCell(value) {
  return String(value)
    .replace(/\r?\n+/g, ' ')
    .trim()
}
