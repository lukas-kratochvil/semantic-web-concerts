import { Injectable } from "@nestjs/common";
import { DataFactory, Writer, type MimeFormat, type Quad } from "n3";
import { AbstractEntity } from "../entities";
import { RDF_METADATA_KEYS, type RDFPropertyMetadata } from "./decorators";
import { ns, prefixes } from "./ontology";

const { literal, namedNode, triple } = DataFactory;

@Injectable()
// eslint-disable-next-line @darraghor/nestjs-typed/injectable-should-be-provided
export class RdfEntitySerializerService {
  #createEntityIRI(entity: AbstractEntity): string {
    const prefixIRI = Reflect.getMetadata(RDF_METADATA_KEYS.prefixIRI, entity.constructor) as string | undefined;

    if (typeof prefixIRI !== "string") {
      throw new Error("Missing @RDFPrefixIRI on " + entity.constructor.name);
    }

    return prefixIRI + entity.id;
  }

  #serializeRDFProperty(
    rdfSubject: string,
    rdfPredicate: string,
    rdfObject: {}, // eslint-disable-line @typescript-eslint/no-empty-object-type
    options: RDFPropertyMetadata["options"],
    quads: Quad[]
  ) {
    // Array
    if (Array.isArray(rdfObject)) {
      rdfObject.forEach((item: unknown) => {
        if (item !== null && item !== undefined) {
          this.#serializeRDFProperty(rdfSubject, rdfPredicate, item, options, quads);
        }
      });
      return;
    }

    // Nested object
    if (rdfObject instanceof AbstractEntity) {
      const objectIRI = this.#createEntityIRI(rdfObject);
      quads.push(triple(namedNode(rdfSubject), namedNode(rdfPredicate), namedNode(objectIRI)));
      this.#serializeRDFClass(rdfObject, objectIRI, quads);
      return;
    }

    // Enum
    if (options?.discriminator === "enum" && typeof rdfObject === "string") {
      const enumValueIRI = options.map[rdfObject];

      if (!enumValueIRI) {
        throw new Error(`No mapping for '${rdfObject}' enum value on property '${rdfPredicate}'`);
      }

      quads.push(triple(namedNode(rdfSubject), namedNode(rdfPredicate), namedNode(enumValueIRI)));
      return;
    }

    // Literal
    let literalValue: string;
    if (typeof rdfObject === "string") {
      literalValue = rdfObject.replace(/"/g, '\\"');
    } else if (rdfObject instanceof Date) {
      literalValue = rdfObject.toISOString();
    } else {
      literalValue = rdfObject.toString();
    }

    if (options) {
      if (options.discriminator === "datatype") {
        quads.push(
          triple(namedNode(rdfSubject), namedNode(rdfPredicate), literal(literalValue, namedNode(options.datatype)))
        );
      } else if (options.discriminator === "language") {
        quads.push(triple(namedNode(rdfSubject), namedNode(rdfPredicate), literal(literalValue, options.language)));
      }
    } else {
      quads.push(triple(namedNode(rdfSubject), namedNode(rdfPredicate), literal(literalValue)));
    }
  }

  #serializeRDFClass(entity: AbstractEntity, subjectIRI?: string, quads: Quad[] = []): Quad[] {
    const classIRI = Reflect.getMetadata(RDF_METADATA_KEYS.class, entity.constructor) as string | undefined;

    if (typeof classIRI !== "string") {
      throw new Error("Missing @RDFClass on " + entity.constructor.name);
    }

    const rdfSubject = subjectIRI ?? this.#createEntityIRI(entity);
    quads.push(triple(namedNode(rdfSubject), namedNode(ns.rdf.type), namedNode(classIRI)));

    for (const [propertyKey, rdfObject] of Object.entries(entity) as [string, unknown][]) {
      if (rdfObject === null || rdfObject === undefined) {
        continue;
      }

      const metadata = Reflect.getMetadata(RDF_METADATA_KEYS.property, entity.constructor, propertyKey) as
        | RDFPropertyMetadata
        | undefined;

      if (!metadata) {
        continue;
      }

      this.#serializeRDFProperty(rdfSubject, metadata.iri, rdfObject, metadata.options, quads);
    }

    return quads;
  }

  serialize(entity: AbstractEntity, format: MimeFormat): Promise<string> {
    const quads = this.#serializeRDFClass(entity);
    return new Promise((resolve, reject) => {
      const writer = new Writer({
        format,
        prefixes,
      });
      writer.addQuads(quads);
      writer.end((error, result) => (error ? reject(error) : resolve(result)));
    });
  }
}
