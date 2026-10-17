import type { AnalysisResult, MethodArticle, ResearchIssue, UpdateSettings } from "./types";

export const demoIssues: ResearchIssue[] = [
  {
    id: "2026-10-14",
    date: "2026-10-14",
    dateRange: "OCT 08–14, 2026",
    title: "Programmable nucleic acids and selective catalysis",
    synthesis:
      "本期关注核酸结构如何塑造反应微环境，以及计算方法如何帮助解释催化选择性。所选论文覆盖 DNA 手性催化、RNA 结构表征和反应环境建模。",
    generatedAt: "2026-10-14T09:00:00+08:00",
    papers: [
      {
        id: "dna-chiral-catalysis",
        title: "Programmable DNA microenvironments for asymmetric catalysis in water",
        authors: "M. Chen, R. Alvarez, and collaborators",
        venue: "ChemRxiv",
        publishedAt: "2026-10-12",
        topics: ["DNA", "CATALYSIS"],
        summary:
          "作者利用可编程 DNA 二级结构调节金属配位位点附近的疏水性与空间限制，在水相不对称反应中观察到可调的对映选择性。结果强调序列本身并非唯一变量，局部构象与底物定位共同决定催化表现。",
        coreProblem: "如何将 DNA 的可编程结构转化为可预测的手性反应微环境。",
        strategy: "比较不同序列、二级结构与金属配位模块形成的催化体系。",
        innovation: "把结构表征和催化选择性关联到统一的局部微环境模型。",
        evidence: "多组底物、构象探针和对照序列支持结构—选择性关联。",
        uncertainty: "底物范围仍有限，结构变化与速率变化之间的因果关系需要进一步验证。",
        doi: "10.26434/chemrxiv-2026-demo",
        url: "https://chemrxiv.org/"
      },
      {
        id: "rna-ensemble",
        title: "Learning RNA conformational ensembles from sparse chemical probing",
        authors: "A. Patel, J. Liu, et al.",
        venue: "bioRxiv",
        publishedAt: "2026-10-10",
        topics: ["RNA", "AI FOR CHEMISTRY"],
        summary:
          "该研究将稀疏化学探针数据与结构先验结合，学习 RNA 的构象集合而非单一最低能结构。模型给出的不确定性可用于判断哪些区域需要追加实验约束。",
        coreProblem: "有限实验数据下如何描述 RNA 的动态构象分布。",
        strategy: "以物理先验约束概率模型，并用独立探针数据评估泛化。",
        innovation: "把预测目标从单结构扩展为带校准不确定性的构象集合。",
        evidence: "多个 RNA 家族和留出实验条件上的一致性评估。",
        uncertainty: "长 RNA 和配体诱导构象变化的覆盖仍不足。",
        doi: "10.1101/2026.10.10.demo",
        url: "https://www.biorxiv.org/"
      },
      {
        id: "reaction-environment",
        title: "Interpretable representations of catalytic reaction environments",
        authors: "S. Kumar, E. Wright, et al.",
        venue: "Journal of Catalysis",
        publishedAt: "2026-10-09",
        topics: ["ORGANIC SYNTHESIS", "INTERPRETABILITY"],
        summary:
          "论文提出一种保留配位结构和溶剂暴露信息的反应表示，用于区分影响选择性的局部因素。可解释性分析提供候选机制，但并不能替代动力学或光谱证据。",
        coreProblem: "如何让反应预测表示同时保留局部化学意义。",
        strategy: "构建几何感知表示并以消融和反事实扰动检查特征贡献。",
        innovation: "把模型归因限定到可实验验证的局部环境变化。",
        evidence: "跨反应家族测试、消融研究与部分实验趋势吻合。",
        uncertainty: "归因结果仍依赖训练分布，不应直接解释为反应机制。",
        doi: "10.1016/j.jcat.2026.demo",
        url: "https://www.sciencedirect.com/journal/journal-of-catalysis"
      }
    ]
  }
];

export const demoMethods: MethodArticle[] = [
  {
    id: "method-1",
    slug: "dna-phosphates-as-ion-pairing-catalysts",
    title: "DNA phosphates as catalytic handles for asymmetric ion pairing",
    excerpt: "How phosphate groups in the DNA backbone organize cationic reagents and transmit stereochemical information in water.",
    content: `# DNA phosphates as catalytic handles for asymmetric ion pairing

**Paper** · Z. Li, Y. Zheng, Q. Zhao, et al. *Nature Catalysis* **8**, 1220–1231 (2025)

**Links** · [Original paper](https://doi.org/10.1038/s41929-025-01437-z) · [Nature article page](https://www.nature.com/articles/s41929-025-01437-z) · [Research news](https://www.sciencedaily.com/releases/2025/11/251108083914.htm)

## The question

DNA-based asymmetric catalysis is usually explained through base-pair sequence, helical shape, hydrophobic pockets, or a metal complex attached to the duplex. This paper asks whether a less conspicuous part of DNA—the negatively charged **phosphate backbone**—can participate directly in catalysis.

The authors' proposal is electrostatic: a DNA phosphate can form an ion pair with a positively charged reagent. If that association occurs close to the chiral double helix, the backbone may help position the reagent, accelerate reaction, and favor one stereochemical pathway over another.

![Li Lab schematic of DNA-phosphate ion-pairing catalysis](/methods/dna-phosphate-ion-pairing.svg)

*Li Lab schematic. This is an editorial interpretation of the workflow, not a reproduction of a published figure.*

## The method: phosphorothioate scanning

The key experimental strategy is **PS scanning**. At one backbone position at a time, a non-bridging oxygen in a phosphate group is replaced with sulfur to create a phosphorothioate linkage. This is a deliberately local perturbation: it retains the DNA scaffold while changing the electrostatic, steric, and polarizability profile of a selected backbone site.

1. Start with a DNA catalyst that gives measurable asymmetric induction.
2. Prepare a panel of variants carrying a phosphorothioate at different positions.
3. Run the same reaction with each variant under matched conditions.
4. Compare conversion and enantioselectivity to map backbone positions that influence catalysis.
5. Use computation to examine how cations, phosphate sites, and the DNA environment reorganize around one another.

Because a phosphorothioate linkage can introduce additional stereochemical complexity, a change in outcome is best read as evidence that a position matters—not as proof that a single static contact is the entire mechanism.

## What the work demonstrates

Experimental and computational results support a role for DNA phosphates in both **rate acceleration** and **stereoinduction** through interactions with cationic reaction partners. The study also describes the interaction as dynamic and cation-dependent: the catalytic environment adapts rather than behaving like a rigid lock-and-key pocket.

The approach was applied across three reaction families:

- asymmetric fluorination;
- Mannich reactions;
- photo-induced cross-dehydrogenative coupling.

That breadth matters because it moves the phosphate effect beyond a single isolated transformation. More importantly, PS scanning turns the backbone into something that can be interrogated position by position.

## Why this changes the design model

The practical lesson is that DNA should not be reduced to a passive chiral wall around a conventional catalyst. Its repeating phosphate groups form a chemically addressable surface. Sequence, fold, counterions, local phosphate identity, and the charge state of the reagent can therefore be treated as coupled design variables.

A useful design loop is:

| Step | Design question |
| --- | --- |
| Map | Which phosphate positions affect rate or selectivity? |
| Perturb | Does changing the linkage or cation change the outcome? |
| Model | Which transient ion-paired arrangements are compatible with the data? |
| Transfer | Does the same positional logic survive a new substrate or reaction class? |

## Evidence boundary

The work establishes that phosphate-site perturbations and cation-dependent interactions can influence catalytic performance in the reported systems. It does **not** mean every DNA-catalyzed reaction is controlled by the same phosphate contact, nor that a computationally favored structure is a directly observed transition state. Generality across broader substrates, catalyst loadings, scales, and aqueous media remains an experimental question.

## Reading takeaways

- Treat the DNA backbone as part of the catalytic interface, not merely structural support.
- Use PS scanning as a positional diagnostic before making a detailed mechanism claim.
- Separate a site's effect on binding, rate, and stereoselectivity with matched controls.
- Test cation identity explicitly; the catalytic assembly is dynamic and condition-dependent.

### Citation

Li, Z.; Zheng, Y.; Zhao, Q.; et al. “DNA phosphates are effective catalysts for asymmetric ion-pairing catalysis in water.” *Nature Catalysis* **8**, 1220–1231 (2025). [https://doi.org/10.1038/s41929-025-01437-z](https://doi.org/10.1038/s41929-025-01437-z)`,
    tags: ["DNA", "ION PAIRING", "ASYMMETRIC CATALYSIS"],
    status: "published",
    author: "Li Lab",
    updatedAt: "2025-10-31T00:00:00+08:00",
    version: 1
  },
  {
    id: "method-2",
    slug: "dna-repair-bioorthogonal-catalyst-libraries",
    title: "A repair-and-conjugate workflow for building DNA catalyst libraries",
    excerpt: "How base-excision repair and bioorthogonal ligation make diverse DNA hybrid catalysts easier to assemble and screen.",
    content: `# A repair-and-conjugate workflow for building DNA catalyst libraries

**Paper** · J. Sheng, Z. Li, K. K. Y. Koh, et al. *Journal of the American Chemical Society* **146**, 16531–16539 (2024)

**Links** · [Original paper](https://doi.org/10.1021/jacs.4c03210) · [PubMed record](https://pubmed.ncbi.nlm.nih.gov/38860598/) · [NUS research summary](https://www.science.nus.edu.sg/blog/2024/10/asymmetric-catalysis-with-dna-hybrid-catalysts/)

## The bottleneck

DNA hybrid catalysis combines a programmable chiral biomolecule with a synthetic catalytic group. The concept is modular, but making many variants can be laborious when every catalyst requires a separately modified oligonucleotide or specialized solid-phase synthesis.

This paper reframes that preparation problem as a two-stage workflow: let a DNA repair enzyme create a chemically useful site, then attach diverse catalyst modules through a bioorthogonal reaction. A common DNA precursor can therefore support a much broader screening library.

![Li Lab schematic of the DNA repair and bioorthogonal conjugation workflow](/methods/dna-repair-conjugation.svg)

*Li Lab schematic. This is an editorial interpretation of the workflow, not a reproduction of a published figure.*

## The method: repair, reveal, conjugate

The design borrows the selectivity of **base-excision repair**. A uracil-DNA glycosylase recognizes deoxyuridine in DNA and removes the base, generating an abasic site with a reactive aldehyde form. That handle can then react with compatible catalyst modules through oxime- or hydrazone-forming chemistry.

1. **Encode the attachment site.** Place deoxyuridine at a chosen position in an otherwise standard DNA sequence.
2. **Reveal a chemical handle.** Use the repair enzyme to excise uracil and expose the abasic aldehyde equilibrium.
3. **Conjugate under mild conditions.** Couple the DNA handle to a catalyst-bearing nucleophile using a bioorthogonal ligation.
4. **Screen composition and position.** Recombine DNA environments with catalyst modules carrying different, unprotected functional groups.

The authors used this strategy to assemble a library of **44 DNA hybrid catalysts**. The significance of that number is methodological: the platform makes parallel diversification practical without rebuilding every oligonucleotide from the beginning.

## What the work demonstrates

The library accommodates catalyst modules with varied unprotected functional groups and enables a faster route from molecular design to catalytic screening. According to the paper and the accompanying NUS summary, optimized hybrids improved stereoselectivity, substrate scope, and reaction efficiency relative to earlier versions of the system.

The study also reports the **first atroposelective DNA catalysis**. This extends DNA asymmetric catalysis from controlling a stereogenic center to controlling axial chirality—a demanding test of whether the hybrid environment can distinguish rotational pathways.

## Why the workflow is reusable

The most transferable idea is not one optimized catalyst but the separation of roles:

| Module | Role |
| --- | --- |
| DNA sequence and fold | Provides the chiral microenvironment |
| Repair substrate | Defines where the attachment handle appears |
| Repair enzyme | Performs site-selective chemical editing |
| Bioorthogonal linker | Connects biological and synthetic modules |
| Catalyst library | Explores reactivity and stereochemical control |

This architecture turns catalyst discovery into a combinatorial problem. The DNA, attachment position, linker, and catalytic group can be varied independently enough to support systematic screening while remaining part of one coupled catalytic assembly.

## Evidence boundary

The paper demonstrates accessibility and versatility for the reported library and transformations. It does not remove the need to characterize conjugation efficiency, abasic-site stability, catalyst composition, or structure–selectivity relationships for each new system. A successful screen identifies a productive combination; it does not by itself reveal why that combination works.

## Reading takeaways

- Use biological recognition to install a site-selective synthetic handle.
- Keep one DNA precursor modular so chemical diversity can be introduced late.
- Track conjugation yield and catalyst identity before comparing reaction outcomes.
- Treat library screening as hypothesis generation, then test the best hits with mechanistic controls.
- Consider axial as well as central chirality when evaluating the reach of a DNA microenvironment.

### Citation

Sheng, J.; Li, Z.; Koh, K. K. Y.; et al. “Merging DNA Repair with Bioorthogonal Conjugation Enables Accessible and Versatile Asymmetric DNA Catalysis.” *J. Am. Chem. Soc.* **146**, 16531–16539 (2024). [https://doi.org/10.1021/jacs.4c03210](https://doi.org/10.1021/jacs.4c03210)`,
    tags: ["DNA REPAIR", "BIOORTHOGONAL CHEMISTRY", "CATALYST SCREENING"],
    status: "published",
    author: "Li Lab",
    updatedAt: "2024-06-11T00:00:00+08:00",
    version: 1
  }
];

export const defaultSettings: UpdateSettings = {
  topics: ["DNA", "RNA", "Catalysis", "Organic Synthesis"],
  cadence: "Every Monday",
  paperCount: 10,
  version: 1,
  updatedAt: "2026-10-14T09:00:00+08:00"
};

export const demoAnalysis: AnalysisResult = {
  id: "analysis-demo",
  fileName: "programmable-dna-catalysis.pdf",
  title: "Programmable DNA microenvironments for asymmetric catalysis in water",
  status: "complete",
  createdAt: "2026-10-14T11:20:00+08:00",
  coreMethod: {
    heading: "将 DNA 构象视为可调节的催化微环境",
    body:
      "论文比较一组共享金属配位模块、但序列与二级结构不同的 DNA 催化体系。核心推断来自结构扰动、底物范围和对照序列之间的一致趋势；这些结果支持局部微环境参与选择性控制，但尚不足以单独确立过渡态机制。",
    evidence: ["Extracted from paper · Methods §2.1–2.4", "AI interpretation · evidence-bounded", "Limitations · substrate scope remains narrow"]
  },
  referenceOrigins: [
    {
      title: "DNA-based asymmetric catalysis: principles and early demonstrations",
      relation: "FOUNDATIONAL METHOD",
      doi: "10.1002/anie.demo-1",
      note: "提供 DNA–金属复合催化的基础设计框架；当前论文继承该框架并把重点转向构象可编程性。"
    },
    {
      title: "Second-sphere control in aqueous asymmetric catalysis",
      relation: "THEORY",
      doi: "10.1021/jacs.demo-2",
      note: "支持第二配位层和局部溶剂环境影响选择性的解释，但并不直接证明本文提出的结构机制。"
    }
  ],
  relatedPapers: [
    {
      title: "Sequence-dependent selectivity in DNA-hybrid catalysts",
      relation: "PREDECESSOR",
      doi: "10.1039/demo-3",
      note: "研究相同问题，但主要以序列筛选建立经验关联。"
    },
    {
      title: "Peptide-defined microenvironments for catalysis in water",
      relation: "ALTERNATIVE METHOD",
      doi: "10.1021/demo-4",
      note: "用可编程肽结构解决相似的水相选择性控制问题。"
    },
    {
      title: "Conformational ensembles in nucleic-acid catalysis",
      relation: "EXTENSION",
      doi: "10.1002/demo-5",
      note: "进一步把静态结构—活性关系扩展为构象集合模型。"
    }
  ]
};
